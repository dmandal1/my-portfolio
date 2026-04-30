// One-time seed: pushes portfolio data to Firestore via REST API (no auth needed temporarily)
const PROJECT = "deepakmandal-dev";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// ── Single-document sections ────────────────────────────────────────────────

const profileData = {
  title: "Deepak Mandal",
  logo_name: "Deepak Mandal",
  nickname: "dmandal",
  job_profile: "Full Stack Developer | Programmer",
  subTitle: "A passionate Full Stack Software Developer 🚀 with experience building Web and Mobile applications using JavaScript, React.js, Node.js, Express, and other modern libraries and frameworks.",
  resumeLink: "https://drive.google.com/file/d/1pfqYOM0ByHmTsEbPJ-_nLh5jRjQ8jaPE/view",
  portfolio_repository: "https://github.com/dmandal1",
  githubProfile: "https://github.com/dmandal1",
};

const seoData = {
  title: "Deepak Mandal - Software Developer",
  description: "A passionate Full Stack Software Developer who builds end-to-end web and mobile applications with scalable, clean architectures that create real impact.",
  ogTitle: "Deepak Kumar Mandal - Full Stack Developer",
  ogType: "website",
  ogUrl: "https://deepakmandal.dev/",
};

const contactData = {
  title: "Contact Me",
  subtitle: "Want to discuss a project, role, or just say hi? My inbox is always open — I will reply within 24 hours.",
  number: "+91-9504243148",
  email_address: "me@deepakmandal.dev",
};

// ── Collection sections ─────────────────────────────────────────────────────

const socialLinks = [
  { name: "Facebook",  link: "https://www.facebook.com/iamdeepakmandal/",  fontAwesomeIcon: "fa-facebook-f",  backgroundColor: "#1877F2", order: 1 },
  { name: "Twitter",   link: "https://twitter.com/iamdeepakmandal",         fontAwesomeIcon: "fa-twitter",     backgroundColor: "#1DA1F2", order: 2 },
  { name: "Instagram", link: "https://www.instagram.com/iamdeepakmandal/", fontAwesomeIcon: "fa-instagram",   backgroundColor: "#E4405F", order: 3 },
  { name: "LinkedIn",  link: "https://www.linkedin.com/in/dmandal1/",       fontAwesomeIcon: "fa-linkedin-in", backgroundColor: "#0077B5", order: 4 },
  { name: "Gmail",     link: "mailto:me@deepakmandal.dev",                  fontAwesomeIcon: "fa-google",      backgroundColor: "#D14836", order: 5 },
  { name: "Github",    link: "https://github.com/dmandal1",                 fontAwesomeIcon: "fa-github",      backgroundColor: "#181717", order: 6 },
];

const education = [
  {
    title: "Dr. A.P.J. Abdul Kalam Technical University",
    subtitle: "B.Tech. in Computer Engineering",
    logo_path: "uptu_logo.png",
    alt_name: "AKTU University",
    duration: "2016 - 2020",
    descriptions: [
      "⚡ CGPA: 7.08/10",
      "⚡ Studied core Computer Science subjects: Data Structures, Algorithms, DBMS, OS, Computer Networks, AI.",
      "⚡ Completed additional courses on Java, Python, React.js, and Full Stack Web Development.",
      "⚡ Active participant in coding competitions, hackathons, and open source communities.",
    ],
    website_link: "https://aktu.ac.in/",
    order: 1,
  },
];

const competitiveSites = [
  { siteName: "HackerRank",    iconifyClassname: "simple-icons:hackerrank",    style: { color: "#2EC866" }, profileLink: "https://www.hackerrank.com/dmandal1",                order: 1 },
  { siteName: "GeeksForGeeks", iconifyClassname: "simple-icons:geeksforgeeks", style: { color: "#2F8D46" }, profileLink: "https://auth.geeksforgeeks.org/user/dmandal/",        order: 2 },
  { siteName: "LeetCode",      iconifyClassname: "simple-icons:leetcode",      style: { color: "#FFA116" }, profileLink: "https://leetcode.com/dmandal1/",                      order: 3 },
  { siteName: "Codechef",      iconifyClassname: "simple-icons:codechef",      style: { color: "#5B4638" }, profileLink: "https://www.codechef.com/users/dmandal148",           order: 4 },
  { siteName: "Codeforces",    iconifyClassname: "simple-icons:codeforces",    style: { color: "#1F8ACB" }, profileLink: "https://codeforces.com/profile/dmandal1",             order: 5 },
];

const skills = [
  {
    title: "Full Stack Development",
    fileName: "FullStackImg",
    order: 1,
    skills: [
      "⚡ Building responsive, high-performance front-end interfaces using React and Redux",
      "⚡ Designing and developing RESTful APIs with Node.js, Express, and NestJS",
      "⚡ Integrating SQL (PostgreSQL, MySQL) and NoSQL (MongoDB, Redis) databases",
      "⚡ Writing unit and integration tests using Jest for reliable, production-ready code",
    ],
    softwareSkills: [
      { skillName: "HTML5",                fontAwesomeClassname: "simple-icons:html5",               style: { color: "#E34F26" } },
      { skillName: "CSS3",                 fontAwesomeClassname: "fa-css3",                           style: { color: "#1572B6" } },
      { skillName: "Bootstrap",            fontAwesomeClassname: "simple-icons:bootstrap",            style: { color: "#7952B3" } },
      { skillName: "JavaScript",           fontAwesomeClassname: "simple-icons:javascript",           style: { backgroundColor: "#000000", color: "#F7DF1E" } },
      { skillName: "TypeScript",           fontAwesomeClassname: "simple-icons:typescript",           style: { backgroundColor: "#000000", color: "#3178C6" } },
      { skillName: "jQuery",               fontAwesomeClassname: "simple-icons:jquery",               style: { color: "#0769AD" } },
      { skillName: "SASS",                 fontAwesomeClassname: "simple-icons:sass",                 style: { color: "#CC6699" } },
      { skillName: "ReactJS",              fontAwesomeClassname: "simple-icons:react",                style: { color: "#61DAFB" } },
      { skillName: "NodeJS",               fontAwesomeClassname: "simple-icons:nodedotjs",            style: { color: "#5FA04E" } },
      { skillName: "NestJS",               fontAwesomeClassname: "simple-icons:nestjs",               style: { color: "#E0234E" } },
      { skillName: "MySQL",                fontAwesomeClassname: "simple-icons:mysql",                style: { color: "#4479A1" } },
      { skillName: "PostgreSQL",           fontAwesomeClassname: "simple-icons:postgresql",           style: { color: "#4169E1" } },
      { skillName: "Sequelize",            fontAwesomeClassname: "simple-icons:sequelize",            style: { color: "#52B0E7" } },
      { skillName: "TypeORM",              fontAwesomeClassname: "simple-icons:typeorm",              style: { color: "#FE0803" } },
      { skillName: "NPM",                  fontAwesomeClassname: "simple-icons:npm",                  style: { color: "#CB3837" } },
      { skillName: "Yarn",                 fontAwesomeClassname: "simple-icons:yarn",                 style: { color: "#2C8EBB" } },
      { skillName: "MongoDB",              fontAwesomeClassname: "simple-icons:mongodb",              style: { color: "#589636" } },
      { skillName: "ExpressJs",            fontAwesomeClassname: "simple-icons:express",              style: { color: "#303030" } },
      { skillName: "Redis",                fontAwesomeClassname: "simple-icons:redis",                style: { color: "#FF4438" } },
      { skillName: "Postman",              fontAwesomeClassname: "simple-icons:postman",              style: { color: "#FF6C37" } },
      { skillName: "Jest",                 fontAwesomeClassname: "simple-icons:jest",                 style: { color: "#C21325" } },
      { skillName: "Git",                  fontAwesomeClassname: "simple-icons:git",                  style: { color: "#f34f29" } },
      { skillName: "GitHub",               fontAwesomeClassname: "simple-icons:github",               style: { color: "#181717" } },
      { skillName: "Bitbucket",            fontAwesomeClassname: "simple-icons:bitbucket",            style: { color: "#0052CC" } },
      { skillName: "Jira",                 fontAwesomeClassname: "simple-icons:jira",                 style: { color: "#0052CC" } },
      { skillName: "Amazon Web Services",  fontAwesomeClassname: "simple-icons:amazonwebservices",    style: { color: "#232F3E" } },
      { skillName: "Amazon S3",            fontAwesomeClassname: "simple-icons:amazons3",             style: { color: "#569A31" } },
      { skillName: "Docker",               fontAwesomeClassname: "simple-icons:docker",               style: { color: "#2496ED" } },
    ],
  },
  {
    title: "Cloud & Infrastructure",
    fileName: "CloudInfraImg",
    order: 2,
    skills: [
      "⚡ Deploying and managing applications on AWS (EC2, S3, Lambda)",
      "⚡ Hosting and maintaining web services with GCP Cloud Run and Firebase",
      "⚡ Containerising applications with Docker for consistent environments",
      "⚡ Setting up CI/CD pipelines and database streaming jobs on GCP and AWS",
    ],
    softwareSkills: [
      { skillName: "GCP",        fontAwesomeClassname: "simple-icons:googlecloud", style: { color: "#4285F4" } },
      { skillName: "AWS",        fontAwesomeClassname: "simple-icons:amazonaws",   style: { color: "#FF9900" } },
      { skillName: "Firebase",   fontAwesomeClassname: "simple-icons:firebase",    style: { color: "#FFCA28" } },
      { skillName: "Docker",     fontAwesomeClassname: "simple-icons:docker",      style: { color: "#2496ED" } },
      { skillName: "PostgreSQL", fontAwesomeClassname: "simple-icons:postgresql",  style: { color: "#336791" } },
      { skillName: "MongoDB",    fontAwesomeClassname: "simple-icons:mongodb",     style: { color: "#47A248" } },
    ],
  },
  {
    title: "UI/UX Design",
    fileName: "DesignImg",
    order: 3,
    skills: [
      "⚡ Designing attractive, accessible user interfaces for web and mobile applications",
      "⚡ Creating wireframes, prototypes, and design systems in Figma",
      "⚡ Crafting logos and visual assets from scratch using Adobe tools",
      "⚡ Mapping application user flows to optimise end-to-end experience",
    ],
    softwareSkills: [
      { skillName: "Adobe Photoshop",   fontAwesomeClassname: "simple-icons:adobephotoshop",   style: { color: "#001732" } },
      { skillName: "Adobe Illustrator", fontAwesomeClassname: "simple-icons:adobeillustrator", style: { color: "#310000" } },
      { skillName: "Adobe XD",          fontAwesomeClassname: "simple-icons:adobexd",          style: { color: "#450135" } },
      { skillName: "Figma",             fontAwesomeClassname: "simple-icons:figma",            style: { color: "#F24E1E" } },
      { skillName: "Canva",             fontAwesomeClassname: "simple-icons:canva",            style: { color: "#00C4CC" } },
    ],
  },
];

const certifications = [
  { title: "JavaScript (Basic) Certificate", subtitle: "- HackerRank", logo_path: "hackerrank_logo.png", certificate_link: "https://www.hackerrank.com/certificates/ce2b03aeef00", alt_name: "HackerRank", color_code: "#050C18", order: 1 },
  { title: "Node (Basic) Certificate", subtitle: "- HackerRank", logo_path: "hackerrank_logo.png", certificate_link: "https://www.hackerrank.com/certificates/b73d3c6e4399", alt_name: "HackerRank", color_code: "#050C18", order: 2 },
  { title: "Digital Marketing", subtitle: "- GCP Training", logo_path: "google_logo.png", certificate_link: "https://drive.google.com/file/d/1X_pTvQk7IsGPyu3eKDPqlfCr1Hy8zflZ", alt_name: "Google", color_code: "#0C9D5899", order: 3 },
  { title: "Introduction to JAVA", subtitle: "- Coding Ninjas India", logo_path: "cn_logo.png", certificate_link: "https://certificate.codingninjas.com/verify/c3a8bd1f9268f956", alt_name: "Coding Ninjas India", color_code: "#E7E7E7", order: 4 },
  { title: "Data Structures in JAVA", subtitle: "- Coding Ninjas India", logo_path: "cn_logo.png", certificate_link: "https://certificate.codingninjas.com/verify/b2057ba196e759c5", alt_name: "Coding Ninjas India", color_code: "#E7E7E7", order: 5 },
  { title: "Nasscom Python", subtitle: "- Coding Ninjas India", logo_path: "cn_logo.png", certificate_link: "https://certificate.codingninjas.com/verify/f1ec762b06a7a01c", alt_name: "Coding Ninjas India", color_code: "#E7E7E7", order: 6 },
  { title: "Open Source Development", subtitle: "- GirlScript Foundation", logo_path: "girlscript_logo.png", certificate_link: "https://drive.google.com/file/d/1yIZL1tWups3RRjECsBPJLsn1Gpsil3Tn", alt_name: "GirlScript Foundation", color_code: "#E54B20", order: 7 },
  { title: "Front-End Web Development", subtitle: "- Coding Ninjas India", logo_path: "cn_logo.png", certificate_link: "https://www.codingninjas.in/verify/3bea56d89b10436d", alt_name: "Coding Ninjas India", color_code: "#E7E7E7", order: 8 },
  { title: "Back-End with Node.js", subtitle: "- Coding Ninjas India", logo_path: "cn_logo.png", certificate_link: "https://www.codingninjas.in/verify/809b6ed726ce9083", alt_name: "Coding Ninjas India", color_code: "#E7E7E7", order: 9 },
  { title: "Advanced Front-End with React", subtitle: "- Coding Ninjas India", logo_path: "cn_logo.png", certificate_link: "https://students.codingninjas.com/verify/2c0effd81a77c37c", alt_name: "Coding Ninjas India", color_code: "#E7E7E7", order: 10 },
  { title: "Database Management System", subtitle: "- Coding Ninjas India", logo_path: "cn_logo.png", certificate_link: "https://certificate.codingninjas.com/view/8ca10e7f3f257285", alt_name: "Coding Ninjas India", color_code: "#E7E7E7", order: 11 },
  { title: "HTML5 & CSS3 Fundamentals", subtitle: "- Microsoft", logo_path: "microsoft_logo.png", certificate_link: "https://drive.google.com/file/d/1cmUaRdRCF-8DzWFdXKNBQm8Phdgb2F_6", alt_name: "Microsoft", color_code: "#E18767", order: 12 },
];

const experiences = [
  { section: "Work", order: 1, title: "Senior Associate Consultant", company: "Infosys Ltd.", company_url: "https://infosys.com/", logo_path: "infosys_logo.png", duration: "Apr 2026 - Present", location: "Noida, India", description: "Working as a Backend Developer at Infosys, building and maintaining enterprise-grade services using JavaScript, Node.js, Express, MS SQL.", color: "#00ACC1" },
  { section: "Work", order: 2, title: "Associate Consultant", company: "Infosys Ltd.", company_url: "https://infosys.com/", logo_path: "infosys_logo.png", duration: "Sept 2024 - Mar 2026", location: "Noida, India", description: "Working as a Backend Developer at Infosys, building and maintaining enterprise-grade services using JavaScript, Node.js, Express, NestJS, MongoDB, Redis, Sequelize, PostgreSQL, TypeORM, and AWS S3.", color: "#0879bf" },
  { section: "Work", order: 3, title: "Backend Developer", company: "Stulink Pvt. Ltd.", company_url: "https://stulink.com/", logo_path: "stulink_logo.png", duration: "Dec 2023 - Aug 2024", location: "Remote, India", description: "Worked as a Backend Developer on production features for the Stulink platform, using JavaScript, Node.js, Express, MongoDB, Redis, and AWS S3.", color: "#279605" },
  { section: "Work", order: 4, title: "Associate Software Developer", company: "Cloudcraftz Solutions Pvt. Ltd.", company_url: "https://www.cloudcraftz.com/", logo_path: "cc_logo.png", duration: "Oct 2021 - Nov 2023", location: "Bangalore, Karnataka, India", description: "Worked as a Backend Developer on live client projects at Cloudcraftz Solutions, using JavaScript, Node.js, Express.js, and MongoDB to build and ship scalable APIs.", color: "#0879bf" },
  { section: "Work", order: 5, title: "Software Developer Trainee", company: "Cloudcraftz Solutions Pvt. Ltd.", company_url: "https://www.cloudcraftz.com/", logo_path: "cc_logo.png", duration: "Apr 2021 - Sep 2021", location: "Bangalore, Karnataka, India", description: "Trained as a Software Developer, gaining hands-on experience with Java, MySQL, HTML, CSS, and JavaScript while contributing to internal projects.", color: "#9b1578" },
  { section: "Work", order: 6, title: "Teaching Assistant", company: "Coding Ninjas", company_url: "https://www.codingninjas.com/", logo_path: "cn_logo.png", duration: "Dec 2019 - Apr 2020", location: "New Delhi, India", description: "Teaching Assistant for the Career Camp (Full Stack Web Development with Node.js) online batch — resolved student doubts, reviewed code, and guided students through project builds.", color: "#fc1f20" },
  { section: "Internships", order: 1, title: "Web Developer Intern", company: "Coding Ninjas India", company_url: "https://www.codingninjas.com/", logo_path: "cn_logo.png", duration: "May 2019 - Sept 2019", location: "New Delhi, India", description: "Developed full-stack web projects using JavaScript, Node.js, React.js, Express, and MongoDB as part of the internship programme.", color: "#ee3c26" },
  { section: "Volunteerships", order: 1, title: "Campus Ambassador", company: "Coding Ninjas", company_url: "https://www.codingninjas.com/", logo_path: "cn_logo.png", duration: "April 2019 - April 2020", location: "New Delhi, India", description: "Led coding awareness at my university under the Coding Ninjas Campus Ambassador programme — organised workshops, hackathons, and seminars to introduce students to programming and web development.", color: "#4285F4" },
];

function toFirestoreValue(val) {
  if (typeof val === "string")  return { stringValue: val };
  if (typeof val === "number")  return { integerValue: String(val) };
  if (typeof val === "boolean") return { booleanValue: val };
  if (val === null)             return { nullValue: null };
  if (Array.isArray(val))      return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === "object")  return { mapValue: { fields: toFirestoreFields(val) } };
  return { stringValue: String(val) };
}

function toFirestoreFields(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toFirestoreValue(v)]));
}

async function checkEmpty(collection) {
  const url = `${BASE}/${collection}?pageSize=1`;
  const res = await fetch(url);
  const data = await res.json();
  return !data.documents || data.documents.length === 0;
}

async function writeDoc(collection, fields) {
  const url = `${BASE}/${collection}`;
  const body = JSON.stringify({ fields: toFirestoreFields(fields) });
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
}

async function writeSingleDoc(collection, docId, fields) {
  const url = `${BASE}/${collection}/${docId}`;
  const body = JSON.stringify({ fields: toFirestoreFields({ ...fields, updatedAt: new Date().toISOString() }) });
  const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
}

async function seedCollection(name, items) {
  const isEmpty = await checkEmpty(name);
  if (!isEmpty) {
    console.log(`  ⚠  ${name}: already has documents — skipping.`);
    console.log(`     Delete the collection in Firebase Console first if you want to re-seed.`);
    return;
  }
  for (const item of items) {
    await writeDoc(name, { ...item, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  console.log(`  ✔  ${name}: ${items.length} documents written.`);
}

async function seedSingleDoc(collectionName, data) {
  await writeSingleDoc(collectionName, "main", data);
  console.log(`  ✔  ${collectionName}/main written.`);
}

console.log("\n🚀  Seeding portfolio data to Firestore…\n");
try {
  await seedSingleDoc("portfolioProfile", profileData);
  await seedSingleDoc("portfolioSeo", seoData);
  await seedSingleDoc("portfolioContact", contactData);
  await seedCollection("portfolioSocialLinks", socialLinks);
  await seedCollection("portfolioEducation", education);
  await seedCollection("portfolioCompetitiveSites", competitiveSites);
  await seedCollection("portfolioSkills", skills);
  await seedCollection("portfolioCertifications", certifications);
  await seedCollection("portfolioExperiences", experiences);
  console.log("\n✅  Done.\n");
} catch (err) {
  console.error("\n❌  Seed failed:", err.message, "\n");
  process.exit(1);
}
