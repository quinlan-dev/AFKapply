// Static suggestion lists for the searchable preference inputs. These are
// starting points, not limits — anything typed is accepted.

export const ROLE_SUGGESTIONS = [
  "Software Engineer", "Senior Software Engineer", "Frontend Engineer", "Backend Engineer",
  "Full Stack Engineer", "Full Stack Developer", "Web Developer", "Mobile Engineer",
  "iOS Engineer", "Android Engineer", "DevOps Engineer", "Site Reliability Engineer",
  "Platform Engineer", "Cloud Engineer", "Infrastructure Engineer", "Systems Engineer",
  "Embedded Software Engineer", "Firmware Engineer", "Game Developer",
  "Data Engineer", "Data Analyst", "Data Scientist", "Analytics Engineer",
  "Business Intelligence Analyst", "Business Analyst", "Machine Learning Engineer",
  "AI Engineer", "ML Ops Engineer", "Research Engineer", "Research Scientist",
  "Computer Vision Engineer", "NLP Engineer",
  "Security Engineer", "Security Analyst", "SOC Analyst", "Cybersecurity Analyst",
  "Application Security Engineer", "Penetration Tester", "Security Researcher",
  "Incident Response Analyst", "GRC Analyst", "Threat Intelligence Analyst",
  "QA Engineer", "Test Engineer", "SDET", "Automation Engineer",
  "Product Manager", "Technical Product Manager", "Project Manager", "Program Manager",
  "Engineering Manager", "Technical Lead", "Solutions Architect", "Software Architect",
  "Database Administrator", "Systems Administrator", "Network Engineer", "IT Support Specialist",
  "Technical Writer", "Developer Advocate", "Solutions Engineer", "Sales Engineer",
  "UX Designer", "UI Designer", "Product Designer"
];

export const SKILL_SUGGESTIONS = [
  "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP",
  "Swift", "Kotlin", "SQL", "R", "Scala", "Bash", "PowerShell",
  "React", "Next.js", "Vue", "Angular", "Node.js", "Express", "Django", "Flask", "FastAPI",
  "Spring", "Rails", ".NET", "GraphQL", "REST",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Kafka", "Spark", "Hadoop",
  "Airflow", "dbt", "Snowflake", "BigQuery", "Tableau", "Power BI", "Excel", "Pandas",
  "NumPy", "scikit-learn", "TensorFlow", "PyTorch", "LLMs", "Prompt Engineering",
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible", "Jenkins",
  "CI/CD", "Git", "Linux",
  "Penetration Testing", "SIEM", "Splunk", "Wireshark", "Burp Suite", "Nmap", "Metasploit",
  "NIST", "SOC 2", "Threat Modeling", "Vulnerability Management", "IAM", "Zero Trust",
  "Agile", "Scrum", "JIRA", "A/B Testing", "Machine Learning", "Data Visualization",
  "ETL", "Data Modeling", "Statistics", "NLP", "Computer Vision"
];

export const LOCATION_SUGGESTIONS = [
  "Remote",
  "New York, NY", "San Francisco, CA", "San Jose, CA", "Los Angeles, CA", "San Diego, CA",
  "Seattle, WA", "Austin, TX", "Dallas, TX", "Houston, TX", "Chicago, IL", "Boston, MA",
  "Atlanta, GA", "Denver, CO", "Boulder, CO", "Phoenix, AZ", "Portland, OR",
  "Washington, DC", "Arlington, VA", "Baltimore, MD", "Philadelphia, PA", "Pittsburgh, PA",
  "Miami, FL", "Tampa, FL", "Orlando, FL", "Charlotte, NC", "Raleigh, NC", "Durham, NC",
  "Nashville, TN", "Columbus, OH", "Cleveland, OH", "Cincinnati, OH", "Detroit, MI",
  "Minneapolis, MN", "St. Louis, MO", "Kansas City, MO", "Salt Lake City, UT",
  "Las Vegas, NV", "Sacramento, CA", "Oakland, CA", "Irvine, CA", "New Orleans, LA",
  "Indianapolis, IN", "Madison, WI", "Milwaukee, WI", "Ann Arbor, MI",
  "Toronto, Canada", "Vancouver, Canada", "London, UK", "Berlin, Germany", "Amsterdam, Netherlands"
];

// Companies with public Greenhouse boards (boards.greenhouse.io/<slug>).
export const GREENHOUSE_BOARD_SUGGESTIONS = [
  "stripe", "airbnb", "gitlab", "coinbase", "databricks", "dropbox", "figma", "robinhood",
  "doordash", "instacart", "cloudflare", "mongodb", "datadoghq", "asana", "brex", "gusto",
  "duolingo", "discord", "flexport", "lyft", "pinterest", "reddit", "samsara", "scaleai",
  "sofi", "twilio", "vercel", "anthropic", "airtable", "affirm", "benchling", "calendly",
  "carta", "checkr", "chime", "grammarly", "hubspot", "klaviyo", "niantic", "nuro",
  "okta", "plaid", "postman", "ramp", "retool", "rippling", "squarespace", "strava"
];

// Companies with public Lever boards (jobs.lever.co/<slug>).
export const LEVER_BOARD_SUGGESTIONS = [
  "palantir", "zoox", "kraken", "voleon", "mistral", "attentive", "highspot", "outreach",
  "veeva", "welocalize", "spotify", "netflix", "plaid", "wealthsimple", "shipt", "sword-health",
  "lucidmotors", "matchgroup", "quora", "octoenergy", "whoop", "saronic", "zips-car-wash"
];
