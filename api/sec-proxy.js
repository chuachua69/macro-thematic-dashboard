const https = require('https');

// Helper to make HTTPS requests with User-Agent headers (required by SEC)
function fetchSec(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'institutional_architect@quantfirm.com (compatibility proxy for macro thematic investing dashboard)',
                'Accept-Encoding': 'identity'
            }
        };
        
        https.get(url, options, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`SEC returned status ${res.statusCode} for URL: ${url}`));
                return;
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

// Extract XML values using namespace-agnostic regular expressions
function parse13FXml(xmlString) {
    const records = [];
    const infoTableRegex = /<[^:]*?:?infoTable[\s\S]*?>([\s\S]*?)<\/[^:]*?:?infoTable>/g;
    let match;
    
    while ((match = infoTableRegex.exec(xmlString)) !== null) {
        const block = match[1];
        
        const nameOfIssuerMatch = /<[^:]*?:?nameOfIssuer>([\s\S]*?)<\/[^:]*?:?nameOfIssuer>/.exec(block);
        const cusipMatch = /<[^:]*?:?cusip>([\s\S]*?)<\/[^:]*?:?cusip>/.exec(block);
        const valueMatch = /<[^:]*?:?value>([\s\S]*?)<\/[^:]*?:?value>/.exec(block);
        const sshPrnamtMatch = /<[^:]*?:?sshPrnamt>([\s\S]*?)<\/[^:]*?:?sshPrnamt>/.exec(block);
        const putCallMatch = /<[^:]*?:?putCall>([\s\S]*?)<\/[^:]*?:?putCall>/.exec(block);
        
        if (nameOfIssuerMatch && cusipMatch && valueMatch) {
            records.push({
                issuer: nameOfIssuerMatch[1].trim(),
                cusip: cusipMatch[1].trim(),
                value: parseFloat(valueMatch[1].trim()) || 0,
                shares: sshPrnamtMatch ? parseInt(sshPrnamtMatch[1].trim()) || 0 : 0,
                optionType: putCallMatch ? putCallMatch[1].trim().toUpperCase() : 'UNDERLYING'
            });
        }
    }
    return records;
}

// Serverless Handler Entrypoint
module.exports = async (req, res) => {
    // Enable CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');

    const { cik } = req.query;
    if (!cik) {
        return res.status(400).json({ error: 'Missing CIK parameter' });
    }

    try {
        // 1. Pad CIK to 10 digits
        const cleanCik = cik.replace(/\D/g, ''); // strip non-numeric characters
        const paddedCik = cleanCik.padStart(10, '0');

        // 2. Fetch Submissions Directory from SEC EDGAR
        const submissionsUrl = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;
        const submissionsPayload = await fetchSec(submissionsUrl);
        const submissions = JSON.parse(submissionsPayload);

        if (!submissions.filings || !submissions.filings.recent) {
            throw new Error(`Invalid CIK data structure from SEC EDGAR CIK: ${cik}`);
        }

        const recentFilings = submissions.filings.recent;
        
        // Find latest 13F-HR filing index
        let latestIdx = -1;
        for (let i = 0; i < recentFilings.form.length; i++) {
            if (recentFilings.form[i] === '13F-HR') {
                latestIdx = i;
                break;
            }
        }

        if (latestIdx === -1) {
            return res.status(404).json({ error: `No 13F-HR filings resolved for CIK: ${cleanCik}` });
        }

        const accessionNumber = recentFilings.accessionNumber[latestIdx];
        const accessionWithoutDashes = accessionNumber.replace(/-/g, '');
        const primaryDoc = recentFilings.primaryDocument[latestIdx];

        // 3. Query directory folder index.json to find XML infotable file
        const folderUrl = `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${accessionWithoutDashes}/index.json`;
        let infotableFileName = '';

        try {
            const folderIndexPayload = await fetchSec(folderUrl);
            const folderIndex = JSON.parse(folderIndexPayload);
            const files = folderIndex.directory.item || [];
            
            // Search for infotable ending in .xml
            const targetFile = files.find(file => 
                file.name.toLowerCase().includes('infotable') && file.name.endsWith('.xml')
            );
            
            if (targetFile) {
                infotableFileName = targetFile.name;
            }
        } catch (e) {
            console.log('Error reading index.json, falling back to primary document check', e);
        }

        // Fallback if index.json fails or file not found
        if (!infotableFileName) {
            if (primaryDoc && primaryDoc.endsWith('.xml')) {
                infotableFileName = primaryDoc;
            } else {
                // Common default naming conventions for 13F attachments
                infotableFileName = 'form13fInfoTable.xml';
            }
        }

        // 4. Fetch the XML attachment
        const xmlUrl = `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${accessionWithoutDashes}/${infotableFileName}`;
        const xmlPayload = await fetchSec(xmlUrl);

        // 5. Parse XML records
        const rawHoldings = parse13FXml(xmlPayload);

        if (rawHoldings.length === 0) {
            return res.status(500).json({ error: `Parsed 0 holdings from XML at: ${xmlUrl}. Filing structure may have changed.` });
        }

        // 6. Consolidate duplicates by CUSIP and sort by position value descending
        const consolidated = {};
        rawHoldings.forEach(h => {
            const key = h.cusip;
            if (!consolidated[key]) {
                consolidated[key] = {
                    cusip: h.cusip,
                    issuer: h.issuer,
                    value_k: 0,
                    shares_held: 0,
                    option_type: h.optionType
                };
            }
            consolidated[key].value_k += h.value;
            consolidated[key].shares_held += h.shares;
        });

        const sortedHoldings = Object.values(consolidated)
            .sort((a, b) => b.value_k - a.value_k)
            .slice(0, 12); // Return top 12 positions

        // Return final parsed data bundle
        res.status(200).json({
            manager: submissions.name,
            cik: cleanCik,
            filingDate: recentFilings.filingDate[latestIdx],
            accessionNumber: accessionNumber,
            holdings: sortedHoldings
        });

    } catch (error) {
        console.error('SEC Proxy error:', error);
        res.status(500).json({ error: error.message || 'Internal server parsing error' });
    }
};
