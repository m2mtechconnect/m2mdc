# Canadian Funding Source Scanner

A comprehensive system for discovering, validating, and cataloging Canadian government and public funding programs relevant to AI, digital transformation, innovation, and SMEs.

## Architecture

### Database Schema

**`funding_programs`** - Main table storing funding program data
- Indexed on: jurisdiction, province, status, focus_areas, funding_type
- Public read access, service role write access

**`scraper_logs`** - Audit trail of scraper runs
- Tracks success/failure, programs found/inserted/updated

### Components

1. **Source Registry** (`src/lib/funding/sourceRegistry.ts`)
   - Configuration for each funding source
   - Easily extensible for new sources

2. **Scraper Engine** (`supabase/functions/funding-scraper/index.ts`)
   - Fetches and normalizes funding program data
   - Implements rate limiting and error handling
   - Currently supports:
     - Scale AI (Federal AI/Supply Chain)
     - NRC IRAP (Federal Innovation)
     - NGen (Federal Advanced Manufacturing)

3. **Query API** (`supabase/functions/funding-query/index.ts`)
   - RESTful API for querying funding programs
   - Supports filtering by jurisdiction, province, focus areas, status, etc.

4. **Client SDK** (`src/lib/funding/queryClient.ts`)
   - TypeScript client for frontend integration
   - Helper functions for recommendation engine

## Current Funding Sources

### Federal Programs
- **Scale AI** - AI-powered supply chains, manufacturing
- **NRC IRAP** - Innovation support, technology R&D
- **NGen** - Advanced manufacturing, Industry 4.0

### Data Coverage
Currently cataloging **6 programs** across 3 major federal sources:
- Scale AI Innovation Programs ($100K - $5M)
- Scale AI Supply Chain Projects ($250K - $5M)
- IRAP Financial Assistance ($10K - $10M)
- IRAP Youth Employment ($15K - $45K)
- NGen Advanced Manufacturing ($500K - $10M)
- NGen Scale-Up & Adoption ($250K - $5M)

## Usage

### Running the Scraper

```typescript
import { triggerFundingScraper } from '@/lib/funding/queryClient';

// Trigger scraper manually
const result = await triggerFundingScraper();
console.log(result);
// { success: true, message: "Scraper completed: 6 programs found" }
```

### Querying Programs

```typescript
import { queryFundingPrograms } from '@/lib/funding/queryClient';

// Query open AI programs
const result = await queryFundingPrograms({
  focus: 'AI',
  status: 'Open',
  jurisdiction: 'Federal',
  limit: 10
});

console.log(`Found ${result.count} programs`);
result.programs.forEach(p => {
  console.log(`${p.program_name} - ${p.agency}`);
});
```

### Integration with Recommendation Engine

```typescript
import { getFundingForFocusAreas } from '@/lib/funding/queryClient';

// Get funding programs for specific focus areas
const focusAreas = ['AI', 'Digital Transformation', 'Manufacturing'];
const fundingPrograms = await getFundingForFocusAreas(focusAreas, {
  status: 'Open',
  limit: 5
});

// Use in recommendation tags
const fundingTags = fundingPrograms.map(p => ({
  name: p.program_name,
  agency: p.agency,
  url: p.url,
  amount: `$${p.funding_amount_min?.toLocaleString()} - $${p.funding_amount_max?.toLocaleString()}`
}));
```

## API Endpoints

### POST /funding-scraper
Trigger funding source scraper

**Request:**
```json
{
  "action": "scan"
}
```

**Response:**
```json
{
  "success": true,
  "programs_found": 6,
  "programs_inserted": 6,
  "programs_updated": 0,
  "programs_skipped": 0
}
```

### GET /funding-query
Query funding programs

**Query Parameters:**
- `jurisdiction` - Federal | Provincial | Regional | Municipal
- `province` - Province code (ON, QC, BC, AB, etc.)
- `focus` - Focus area (AI, Digital, Manufacturing, etc.)
- `status` - Open | Closed | Upcoming | Continuous | Unknown
- `funding_type` - Grant | Loan | Contribution | etc.
- `min_amount` - Minimum funding amount
- `max_amount` - Maximum funding amount
- `limit` - Result limit (default 50)

**Example:**
```
GET /funding-query?focus=AI&status=Open&jurisdiction=Federal&limit=10
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "programs": [
    {
      "id": "...",
      "program_name": "Scale AI Innovation Programs",
      "agency": "Scale AI",
      "jurisdiction": "Federal",
      "url": "https://www.scaleai.ca/programs",
      "focus_areas": ["AI", "Supply Chain", "Manufacturing"],
      "funding_type": ["Grant", "Contribution"],
      "funding_amount_min": 100000,
      "funding_amount_max": 5000000,
      "status": "Open",
      "description": "...",
      "eligibility_summary": "..."
    }
  ]
}
```

## Adding New Funding Sources

1. **Add source config** to `src/lib/funding/sourceRegistry.ts`:

```typescript
newsource: {
  name: 'New Funding Source',
  baseUrl: 'https://example.ca',
  enabled: true,
  rateLimit: 2000,
  selectors: {
    programName: 'h1',
    description: '.content',
  },
  jurisdiction: 'Federal',
  agency: 'New Agency Name',
  defaultFocusAreas: ['Innovation', 'Technology'],
  defaultFundingType: ['Grant'],
}
```

2. **Implement scraper** in `supabase/functions/funding-scraper/index.ts`:

```typescript
const scrapeNewSource = async (): Promise<FundingProgram[]> => {
  const config = SCRAPERS.newsource;
  // Implement scraping logic
  return programs;
};

// Add to runAllScrapers()
const newSourcePrograms = await scrapeNewSource();
allPrograms.push(...newSourcePrograms);
```

3. **Test** the new scraper

## Compliance & Best Practices

✅ **Implemented:**
- Rate limiting (2000ms between requests)
- Respectful scraping patterns
- Error handling and logging
- Deduplication by URL
- Service role security

⚠️ **To Implement:**
- robots.txt checking
- User-Agent headers
- Retry logic with exponential backoff
- HTML parsing for dynamic sources
- Scheduled scraper jobs

## Future Enhancements

### Additional Sources to Add:
- [ ] CDAP (Canada Digital Adoption Program)
- [ ] SDTC (Sustainable Development Technology Canada)
- [ ] FedDev Ontario
- [ ] Western Economic Diversification Canada
- [ ] ACOA (Atlantic Canada Opportunities Agency)
- [ ] CED-Q (Canada Economic Development for Quebec)
- [ ] Investissement Québec
- [ ] Ontario Innovation Funds
- [ ] BC Innovation Council
- [ ] Alberta Innovates

### Technical Improvements:
- [ ] HTML parsing with Cheerio/JSDOM
- [ ] Pagination support
- [ ] robots.txt validation
- [ ] Scheduled cron jobs
- [ ] Change detection / diff
- [ ] Email notifications on new programs
- [ ] Admin dashboard for monitoring
- [ ] Program categorization ML model

## Testing

### Manual Test
```bash
# Trigger scraper via API
curl -X POST https://your-project.supabase.co/functions/v1/funding-scraper \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "scan"}'

# Query programs
curl "https://your-project.supabase.co/functions/v1/funding-query?focus=AI&status=Open"
```

### Verification Checklist
- [ ] Programs ingested for each source (Scale AI: 2, IRAP: 2, NGen: 2)
- [ ] URLs are correct and accessible
- [ ] Program names match official sources
- [ ] Jurisdiction and province fields accurate
- [ ] Focus areas properly tagged
- [ ] Funding amounts parsed correctly
- [ ] Status reflects current state
- [ ] No duplicate entries (dedupe by URL working)

## Logs & Monitoring

View scraper logs:
```typescript
import { getScraperLogs } from '@/lib/funding/queryClient';

const logs = await getScraperLogs(10);
logs.forEach(log => {
  console.log(`${log.source_name}: ${log.status} - ${log.programs_found} found`);
});
```

Check database directly:
```sql
-- View all programs
SELECT program_name, agency, jurisdiction, status, url 
FROM funding_programs 
ORDER BY last_scraped_at DESC;

-- View scraper logs
SELECT source_name, status, programs_found, started_at, completed_at 
FROM scraper_logs 
ORDER BY started_at DESC;

-- Count by jurisdiction
SELECT jurisdiction, COUNT(*) 
FROM funding_programs 
GROUP BY jurisdiction;

-- Count by focus area
SELECT unnest(focus_areas) as focus, COUNT(*) 
FROM funding_programs 
GROUP BY focus 
ORDER BY COUNT DESC;
```

## License & Credits

Built for M2M Tech's AI recommendation engine. 
Funding data sourced from official Canadian government websites.
