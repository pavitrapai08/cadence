/**
 * Cadence seed data — the real DecisionFoundry workspace (CLAUDE.md §16 + §6).
 * is_billable rule: groups 1 & 2 → false only if name starts with "NB_";
 * groups 3–7 (all under non-billable projects) → every tag false.
 */

export interface SeedTag {
  name: string;
  is_billable: boolean;
  is_required?: boolean;
}
export interface SeedTagGroup {
  name: string;
  tags: SeedTag[];
}
export interface SeedProject {
  name: string;
  client: string;
  tag_group: string;
  colour: string;
  external_id: string;
}

const b = (names: string[]): SeedTag[] =>
  names.map((name) => ({ name, is_billable: true }));
const nb = (names: string[]): SeedTag[] =>
  names.map((name) => ({ name, is_billable: false }));

export const CLIENTS = [
  "Dr. Reddy's",
  "Intrigue Media Solutions Inc",
  "SiteOne Landscape Supply",
  "The Chicago Dental Studio",
  "Non Billable Project",
];

export const TAG_GROUPS: SeedTagGroup[] = [
  {
    name: "MCI COE_Billable Project Tags",
    tags: [
      ...b([
        "Pre Discovery",
        "Discovery and Concepting",
        "Data Source Authentication",
        "Data Ingestion / Preparation",
        "Harmonization / Transformation",
        "Wireframe Development",
        "Dashboard Creation",
        "User Acceptance Testing",
        "QA / Validation / Audit",
        "Client Communication (Calls/ Emails/ Tickets)",
        "Project Manager Tasks",
        "Client Training",
        "Users, Workspace and Account Management",
        "Client Audit Project",
        "Maintenance Activities",
        "Solution Design and Architecture",
        "Data Strategy",
        "Final Delivery",
      ]),
      ...nb([
        "NB_Data Ingestion / Preparation",
        "NB_Discovery and Concepting",
        "NB_Internal Meeting",
        "NB_Client Success Meetings",
        "NB_Client Success Task",
        "NB_Memosight",
        "NB_Harmonization & Transformation",
        "NB_Wireframe Development",
        "NB_Dashboard Creation",
        "NB_User Acceptance Testing",
        "NB_QA / Validation / Audit",
        "NB_Communication & Meetings",
        "NB_Project Manager Tasks",
        "NB_No Cost Scope",
        "NB_Internal Training / Shadowing",
        "NB_Project KT",
        "NB_Escalation Management",
        "NB_Client Success Communication",
        "NB_Pre Sales",
        "NB_Delivery Account Growth",
      ]),
    ],
  },
  {
    name: "SF Tags - Salesforce Cloud Consulting",
    tags: [
      ...b([
        "Discovery and Concepting",
        "Solution Design and Architecture",
        "Client Communication (Calls/ Emails/ Tickets)",
        "Documentation",
        "Client Training",
        "QA / Validation / Audit",
        "Product Development",
        "Project Management",
      ]),
      ...nb([
        "NB_Internal meeting",
        "NB_Client Success Meetings",
        "NB_Project Management",
        "NB_Client Success Communication",
        "NB_Client Success Sales",
        "NB_Client Communication",
        "NB_Delivery Account Growth",
      ]),
    ],
  },
  {
    name: "AI Internal",
    tags: nb([
      "Memosight",
      "Building",
      "AI Research",
      "Tool Exploration",
      "Automating using AI",
      "Marketing Insights",
      "SF Sales Enablement",
    ]),
  },
  {
    name: "NB_Certifications & Training",
    tags: nb(["Tutoring and Teaching", "SF Set Up and Partner Access"]),
  },
  {
    name: "NB_Learning & Development SF COE",
    tags: nb([
      "Adverity",
      "Agentblazer Status",
      "AI - Org wide (Praveen's AI email)",
      "MCI Accredited Professional (SADA)",
      "Microsoft Certified: Power BI Data Analyst Associate",
      "NinjaCat",
      "Salesforce Certified Agentforce Specialist",
      "Salesforce Certified Marketing Cloud Email Specialist",
      "Salesforce Certified Marketing Cloud Engagement",
      "Salesforce Certified Platform Administrator",
      "Salesforce Certified Platform Developer I",
      "Salesforce Certified Platform Developer II",
      "Salesforce Certified: Data Cloud Consultant",
      "Supermetrics Training",
      "Udemy: Automate the Boring Stuff with Python",
      "Udemy: Looker Studio / Google Data Studio Complete Advanced Tutorial",
      "Udemy: Python for Data Science and Machine Learning",
      "Udemy: The Advanced SQL Course",
      "Udemy: The Complete Google BiqQuery Masterclass: Beginner to Expert",
      "Udemy: The Complete SQL Masterclass",
      "Soft Skills",
    ]),
  },
  {
    name: "NB_Organizational Activity_Datorama COE",
    tags: [
      { name: "All Hands", is_billable: false, is_required: true },
      ...nb([
        "Backend activities (HR/ IT/ Income Tax/ Facilities/Finance)",
        "DF Holiday",
        "Metronome",
        "DF Training Programs (Workshops, Presentations, Hackathons)",
        "Peer Mentoring & Motivation",
        "Performance Reviews (1 on 1's / Quarter Reviews)",
        "Personal Leaves",
        "Process Compliance (Timely/ Fifteen Five/ Greyt HR/ Empulse/ Know B4)",
        "Smurfs Activities",
        "Meeting with TM",
        "Interviews",
      ]),
    ],
  },
  {
    name: "NB_Presales",
    tags: nb([
      "SOW's / Proposals",
      "Pre Sales - Existing Business",
      "Pre Sales - New Business",
      "SF_North America",
      "SF_Rest of the world",
      "Non-SF Projects",
      "Demo",
    ]),
  },
];

// Colours from CLAUDE.md §6. Canada's external_id is the known real value;
// the rest are placeholders an admin can edit in Workspace settings.
export const PROJECTS: SeedProject[] = [
  { name: "Dr. Reddy's SOW 2_Base Market_Canada DTR COE_One Time", client: "Dr. Reddy's", tag_group: "MCI COE_Billable Project Tags", colour: "#1B6B3A", external_id: "US-SFM-MCI-DRR-1291" },
  { name: "Dr. Reddy's SOW 2_DACH DTR COE_One Time", client: "Dr. Reddy's", tag_group: "MCI COE_Billable Project Tags", colour: "#14B8A6", external_id: "US-SFM-MCI-DRR-1292" },
  { name: "Dr. Reddy's SOW 2_Northern Europe DTR COE_One Time", client: "Dr. Reddy's", tag_group: "MCI COE_Billable Project Tags", colour: "#5EEAD4", external_id: "US-SFM-MCI-DRR-1293" },
  { name: "Dr. Reddy's SOW 2_UK DTR COE_One Time", client: "Dr. Reddy's", tag_group: "MCI COE_Billable Project Tags", colour: "#7C3AED", external_id: "US-SFM-MCI-DRR-1294" },
  { name: "Dr. Reddy's SOW 2_Australia DTR COE_One Time", client: "Dr. Reddy's", tag_group: "MCI COE_Billable Project Tags", colour: "#FA8072", external_id: "US-SFM-MCI-DRR-1295" },
  { name: "Intrigue Media Solutions Inc DTR COE_One Time", client: "Intrigue Media Solutions Inc", tag_group: "MCI COE_Billable Project Tags", colour: "#2563EB", external_id: "US-SFM-MCI-IMS-1296" },
  { name: "SiteOne Landscape Supply SFDC COE_One Time", client: "SiteOne Landscape Supply", tag_group: "SF Tags - Salesforce Cloud Consulting", colour: "#EAB308", external_id: "US-SFD-SF-SLS-2001" },
  { name: "The Chicago Dental Studio SFMC COE_One Time", client: "The Chicago Dental Studio", tag_group: "SF Tags - Salesforce Cloud Consulting", colour: "#FB7185", external_id: "US-SFM-SF-CDS-2002" },
  { name: "NB_AI Internal", client: "Non Billable Project", tag_group: "AI Internal", colour: "#EAB308", external_id: "NB-AI-0001" },
  { name: "NB_Certifications & Training", client: "Non Billable Project", tag_group: "NB_Certifications & Training", colour: "#166534", external_id: "NB-CERT-0002" },
  { name: "NB_Learning and Development SF COE", client: "Non Billable Project", tag_group: "NB_Learning & Development SF COE", colour: "#C4B5FD", external_id: "NB-LND-0003" },
  { name: "NB_Organizational Activity_Datorama COE", client: "Non Billable Project", tag_group: "NB_Organizational Activity_Datorama COE", colour: "#7F1D1D", external_id: "NB-ORG-0004" },
  { name: "NB_Presales - BIA", client: "Non Billable Project", tag_group: "NB_Presales", colour: "#22C55E", external_id: "NB-PRE-0005" },
];
