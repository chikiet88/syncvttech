const fs = require('fs');

const files = [
  'vttech-dashboard/src/app/reports/page.tsx',
  'vttech-dashboard/src/app/reports/services/page.tsx',
  'vttech-dashboard/src/components/CrawlLogActions.tsx',
  'vttech-dashboard/src/app/reports/customers/page.tsx',
  'vttech-dashboard/src/app/reports/revenue/page.tsx',
  'vttech-dashboard/src/app/reports/appointments/page.tsx',
  'vttech-dashboard/src/app/reports/treatments/page.tsx',
  'vttech-dashboard/src/app/call-center/records/actions.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace string literals (double quotes)
  content = content.replace(/"http:\/\/localhost:5001([^"]*)"/g, '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}$1`');
  
  // Replace string literals (single quotes - just in case)
  content = content.replace(/'http:\/\/localhost:5001([^']*)'/g, '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}$1`');
  
  // Replace template literals
  content = content.replace(/`http:\/\/localhost:5001([^`]*)`/g, '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}$1`');

  fs.writeFileSync(file, content);
  console.log('Fixed', file);
}
