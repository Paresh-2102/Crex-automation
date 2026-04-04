import { readFileSync } from "fs";
const d = JSON.parse(readFileSync("output/raw-elements.json", "utf8"));
console.log("Keys:", Object.keys(d));
console.log("Login:", d.loginPage.length);
console.log("Properties:", d.propertiesPage.length);
console.log("Filter:", d.filterPanel.length);
console.log("FullPage:", d.fullPage.length);

// Show sidebar / navigation elements
const nav = d.propertiesPage.filter(e => e.href || e.text?.match(/Properties|Filter|Sub Agent|Saved|Settings|Transactions|Knowledge|Enquiry|Affiliate/i));
console.log("\nSidebar/Nav elements:");
nav.forEach(e => console.log(`  ${e.tag} | text: ${e.text?.substring(0,50)} | href: ${e.href || '-'} | class: ${(e.class||'').substring(0,50)}`));

// Show filter-specific elements
const filterEls = d.filterPanel.filter(e => 
  e.text?.match(/Filter|Region|Status|Reset|Apply|All/i) || 
  e.tag === 'select' || 
  (e.tag === 'button' && e.visible)
);
console.log("\nFilter panel elements:");
filterEls.forEach(e => console.log(`  ${e.tag} | text: ${e.text?.substring(0,60)} | class: ${(e.class||'').substring(0,50)} | role: ${e.role || '-'}`));
