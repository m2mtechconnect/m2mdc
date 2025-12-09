# Quick Start Guide - Canadian Funding Scanner

## Run the Scraper (First Time Setup)

### Option 1: Via Console (Easiest)
```typescript
// Open browser console in your app
import { testFundingScanner } from '@/lib/funding/test-integration';
testFundingScanner();
```

### Option 2: Via API Call
```bash
# Using curl
curl -X POST "https://mlhcdcvpvztfjfndmxzl.supabase.co/functions/v1/funding-scraper" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"action": "scan"}'
```

### Option 3: Via TypeScript
```typescript
import { triggerFundingScraper } from '@/lib/funding/queryClient';

const runScraper = async () => {
  const result = await triggerFundingScraper();
  console.log(result);
};

runScraper();
```

## Query Funding Programs

### Simple Query
```typescript
import { queryFundingPrograms } from '@/lib/funding/queryClient';

// Get all open AI programs
const { programs } = await queryFundingPrograms({
  focus: 'AI',
  status: 'Open'
});

console.log(`Found ${programs.length} AI programs`);
```

### Advanced Query
```typescript
// Federal programs with min funding $100K, focus on AI or Manufacturing
const { programs } = await queryFundingPrograms({
  jurisdiction: 'Federal',
  focus: 'AI',
  minAmount: 100000,
  status: 'Open',
  limit: 10
});
```

### For Recommendation Engine
```typescript
import { getFundingForFocusAreas } from '@/lib/funding/queryClient';

// Get funding for recommendation card tags
const focusAreas = ['AI', 'Digital Transformation'];
const funding = await getFundingForFocusAreas(focusAreas, {
  status: 'Open',
  limit: 3
});

// Use in recommendation cards
const tags = funding.map(p => ({
  label: `💰 ${p.program_name}`,
  url: p.url,
  tooltip: `${p.agency} | ${p.funding_amount_min ? '$' + p.funding_amount_min.toLocaleString() : 'Varies'}`
}));
```

## View Results

### Query All Programs
```sql
SELECT 
  program_name,
  agency,
  jurisdiction,
  status,
  funding_amount_min,
  funding_amount_max,
  focus_areas
FROM funding_programs
ORDER BY last_scraped_at DESC;
```

### Count by Source
```sql
SELECT 
  agency,
  COUNT(*) as program_count,
  ARRAY_AGG(DISTINCT status) as statuses
FROM funding_programs
GROUP BY agency
ORDER BY program_count DESC;
```

### Open AI Programs
```sql
SELECT 
  program_name,
  agency,
  url,
  funding_amount_min,
  funding_amount_max
FROM funding_programs
WHERE 'AI' = ANY(focus_areas)
  AND status = 'Open'
ORDER BY funding_amount_max DESC;
```

## Current Data (After First Run)

Expected output from scraper:

```
✅ Programs Found: 6

Scale AI:
- Scale AI Innovation Programs ($100K - $5M)
- Scale AI Supply Chain Projects ($250K - $5M)

NRC IRAP:
- IRAP Financial Assistance ($10K - $10M)
- IRAP Youth Employment ($15K - $45K)

NGen:
- NGen Advanced Manufacturing ($500K - $10M)
- NGen Scale-Up & Adoption ($250K - $5M)
```

## Verification Checklist

After running the scraper, verify:

✅ **Database populated**
```sql
SELECT COUNT(*) FROM funding_programs;
-- Expected: 6 or more
```

✅ **All programs have required fields**
```sql
SELECT program_name, agency, url, jurisdiction 
FROM funding_programs 
WHERE program_name IS NULL 
   OR agency IS NULL 
   OR url IS NULL 
   OR jurisdiction IS NULL;
-- Expected: 0 rows
```

✅ **Focus areas tagged correctly**
```sql
SELECT program_name, focus_areas 
FROM funding_programs 
WHERE cardinality(focus_areas) = 0;
-- Expected: 0 rows
```

✅ **URLs are unique**
```sql
SELECT url, COUNT(*) 
FROM funding_programs 
GROUP BY url 
HAVING COUNT(*) > 1;
-- Expected: 0 rows
```

✅ **Spot Check Programs**

| Program | Agency | URL Valid? | Funding Range Correct? |
|---------|--------|-----------|----------------------|
| Scale AI Innovation | Scale AI | ✅ | ✅ $100K - $5M |
| IRAP Financial | NRC IRAP | ✅ | ✅ $10K - $10M |
| NGen Manufacturing | NGen | ✅ | ✅ $500K - $10M |

## Troubleshooting

### Scraper Not Running
```typescript
// Check scraper logs
import { getScraperLogs } from '@/lib/funding/queryClient';
const logs = await getScraperLogs(5);
console.log(logs);
```

### No Programs Found
- Check edge function logs in Supabase dashboard
- Verify service role key is set correctly
- Check rate limiting (2000ms between sources)

### Duplicate Programs
- Verify URL uniqueness constraint is working
- Check for trailing slashes in URLs
- Review upsert logic in scraper

### Data Quality Issues
```typescript
// Run data validation
import { testFundingScanner } from '@/lib/funding/test-integration';
await testFundingScanner();
// Look for "Test 7: Validating data quality" output
```

## Integration with Recommendation Engine

### Step 1: Import the helper
```typescript
import { getRecommendationFundingTags } from '@/lib/funding/test-integration';
```

### Step 2: Get funding for recommendation
```typescript
const recommendation = {
  title: "Implement AI-Powered Customer Service",
  focusAreas: ["AI", "Customer Experience", "Digital Transformation"]
};

const fundingTags = await getRecommendationFundingTags(recommendation.focusAreas);
```

### Step 3: Display in UI
```typescript
{fundingTags.map(tag => (
  <Badge key={tag.url} variant="outline">
    <ExternalLink className="h-3 w-3 mr-1" />
    <a href={tag.url} target="_blank" rel="noopener noreferrer">
      {tag.name} ({tag.amount})
    </a>
  </Badge>
))}
```

## Next Steps

1. **Test the system**: Run `testFundingScanner()`
2. **Verify data**: Check database for 6 programs
3. **Add more sources**: Implement CDAP, SDTC, provincial programs
4. **Schedule jobs**: Set up cron to refresh weekly
5. **Integrate**: Add funding tags to recommendation cards

## Support

For issues or questions:
- Check logs: `getScraperLogs()`
- View README: `src/lib/funding/README.md`
- Database schema: `supabase/migrations/`
