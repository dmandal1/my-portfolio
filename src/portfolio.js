/* Change this file to get your personal Portfolio */

// Website related settings
const settings = {
  isSplash: false, // Change this to false if you don't want Splash screen.
};

//SEO Related settings
const seo = {
  title: "Deepak Mandal - Software Developer",
  description:
    "A passionate Full Stack Software Developer who builds end-to-end web and mobile applications with scalable, clean architectures that create real impact.",
  og: {
    title: "Deepak Kumar Mandal - Full Stack Developer",
    type: "website",
    url: "https://deepakmandal.dev/",
  },
};

//Home Page
const greeting = {
  title: "Deepak Mandal",
  logo_name: "Deepak Mandal",
  nickname: "dmandal",
  job_profile: "Full Stack Developer | Programmer",
  subTitle:
    "A passionate Full Stack Software Developer 🚀 with experience building Web and Mobile applications using JavaScript, React.js, Node.js, Express, and other modern libraries and frameworks.",
  resumeLink:
    "https://drive.google.com/file/d/1pfqYOM0ByHmTsEbPJ-_nLh5jRjQ8jaPE/view",
  portfolio_repository: "https://github.com/dmandal1",
  githubProfile: "https://github.com/dmandal1",
};

const socialMediaLinks = [
  {
    name: "Facebook",
    link: "https://www.facebook.com/iamdeepakmandal/",
    fontAwesomeIcon: "fa-facebook-f",
    backgroundColor: "#1877F2",
  },
  {
    name: "Twitter",
    link: "https://twitter.com/iamdeepakmandal",
    fontAwesomeIcon: "fa-twitter",
    backgroundColor: "#1DA1F2",
  },
  {
    name: "Instagram",
    link: "https://www.instagram.com/iamdeepakmandal/",
    fontAwesomeIcon: "fa-instagram",
    backgroundColor: "#E4405F",
  },
  {
    name: "LinkedIn",
    link: "https://www.linkedin.com/in/dmandal1/",
    fontAwesomeIcon: "fa-linkedin-in",
    backgroundColor: "#0077B5",
  },
  {
    name: "Gmail",
    link: "mailto:me@deepakmandal.dev",
    fontAwesomeIcon: "fa-google",
    backgroundColor: "#D14836",
  },
  {
    name: "Github",
    link: "https://github.com/dmandal1",
    fontAwesomeIcon: "fa-github",
    backgroundColor: "#181717",
  },
];

const skills = {
  data: [
    {
      title: "Full Stack Development",
      fileName: "FullStackImg",
      skills: [
        "⚡ Building responsive, high-performance front-end interfaces using React and Redux",
        "⚡ Designing and developing RESTful APIs with Node.js, Express, and NestJS",
        "⚡ Integrating SQL (PostgreSQL, MySQL) and NoSQL (MongoDB, Redis) databases",
        "⚡ Writing unit and integration tests using Jest for reliable, production-ready code",
      ],
      softwareSkills: [
        {
          skillName: "HTML5",
          fontAwesomeClassname: "simple-icons:html5",
          style: { color: "#E34F26" },
        },
        {
          skillName: "CSS3",
          fontAwesomeClassname: "fa-css3",
          style: { color: "#1572B6" },
        },
        {
          skillName: "Bootstrap",
          fontAwesomeClassname: "simple-icons:bootstrap",
          style: { color: "#7952B3" },
        },
        {
          skillName: "JavaScript",
          fontAwesomeClassname: "simple-icons:javascript",
          style: { backgroundColor: "#000000", color: "#F7DF1E" },
        },
        {
          skillName: "TypeScript",
          fontAwesomeClassname: "simple-icons:typescript",
          style: { backgroundColor: "#000000", color: "#3178C6" },
        },
        {
          skillName: "jQuery",
          fontAwesomeClassname: "simple-icons:jquery",
          style: { color: "#0769AD" },
        },
        {
          skillName: "SASS",
          fontAwesomeClassname: "simple-icons:sass",
          style: { color: "#CC6699" },
        },
        {
          skillName: "ReactJS",
          fontAwesomeClassname: "simple-icons:react",
          style: { color: "#61DAFB" },
        },
        {
          skillName: "NodeJS",
          fontAwesomeClassname: "simple-icons:nodedotjs",
          style: { color: "#5FA04E" },
        },
        {
          skillName: "NestJS",
          fontAwesomeClassname: "simple-icons:nestjs",
          style: { color: "#E0234E" },
        },
        {
          skillName: "MySQL",
          fontAwesomeClassname: "simple-icons:mysql",
          style: { color: "#4479A1" },
        },
        {
          skillName: "PostgreSQL",
          fontAwesomeClassname: "simple-icons:postgresql",
          style: { color: "#4169E1" },
        },
        {
          skillName: "Sequelize",
          fontAwesomeClassname: "simple-icons:sequelize",
          style: { color: "#52B0E7" },
        },
        {
          skillName: "TypeORM",
          fontAwesomeClassname: "simple-icons:typeorm",
          style: { color: "#FE0803" },
        },
        {
          skillName: "NPM",
          fontAwesomeClassname: "simple-icons:npm",
          style: { color: "#CB3837" },
        },
        {
          skillName: "Yarn",
          fontAwesomeClassname: "simple-icons:yarn",
          style: { color: "#2C8EBB" },
        },
        {
          skillName: "MongoDB",
          fontAwesomeClassname: "simple-icons:mongodb",
          style: { color: "#589636" },
        },
        {
          skillName: "ExpressJs",
          fontAwesomeClassname: "simple-icons:express",
          style: { color: "#303030" },
        },
        {
          skillName: "Redis",
          fontAwesomeClassname: "simple-icons:redis",
          style: { color: "#FF4438" },
        },
        {
          skillName: "Postman",
          fontAwesomeClassname: "simple-icons:postman",
          style: { color: "#FF6C37" },
        },
        {
          skillName: "Jest",
          fontAwesomeClassname: "simple-icons:jest",
          style: { color: "#C21325" },
        },
        {
          skillName: "Git",
          fontAwesomeClassname: "simple-icons:git",
          style: { color: "#f34f29" },
        },
        {
          skillName: "GitHub",
          fontAwesomeClassname: "simple-icons:github",
          style: { color: "#181717" },
        },
        {
          skillName: "Bitbucket",
          fontAwesomeClassname: "simple-icons:bitbucket",
          style: { color: "#0052CC" },
        },
        {
          skillName: "Jira",
          fontAwesomeClassname: "simple-icons:jira",
          style: { color: "#0052CC" },
        },
        {
          skillName: "Amazon Web Services",
          fontAwesomeClassname: "simple-icons:amazonwebservices",
          style: { color: "#232F3E" },
        },
        {
          skillName: "Amazon S3",
          fontAwesomeClassname: "simple-icons:amazons3",
          style: { color: "#569A31" },
        },
        {
          skillName: "Docker",
          fontAwesomeClassname: "simple-icons:docker",
          style: { color: "#2496ED" },
        },
      ],
    },
    {
      title: "Cloud & Infrastructure",
      fileName: "CloudInfraImg",
      skills: [
        "⚡ Deploying and managing applications on AWS (EC2, S3, Lambda)",
        "⚡ Hosting and maintaining web services with GCP Cloud Run and Firebase",
        "⚡ Containerising applications with Docker for consistent environments",
        "⚡ Setting up CI/CD pipelines and database streaming jobs on GCP and AWS",
      ],
      softwareSkills: [
        {
          skillName: "GCP",
          fontAwesomeClassname: "simple-icons:googlecloud",
          style: { color: "#4285F4" },
        },
        {
          skillName: "AWS",
          fontAwesomeClassname: "simple-icons:amazonaws",
          style: { color: "#FF9900" },
        },
        {
          skillName: "Firebase",
          fontAwesomeClassname: "simple-icons:firebase",
          style: { color: "#FFCA28" },
        },
        {
          skillName: "Docker",
          fontAwesomeClassname: "simple-icons:docker",
          style: { color: "#2496ED" },
        },
        {
          skillName: "PostgreSQL",
          fontAwesomeClassname: "simple-icons:postgresql",
          style: { color: "#336791" },
        },
        {
          skillName: "MongoDB",
          fontAwesomeClassname: "simple-icons:mongodb",
          style: { color: "#47A248" },
        },
      ],
    },
    {
      title: "UI/UX Design",
      fileName: "DesignImg",
      skills: [
        "⚡ Designing attractive, accessible user interfaces for web and mobile applications",
        "⚡ Creating wireframes, prototypes, and design systems in Figma",
        "⚡ Crafting logos and visual assets from scratch using Adobe tools",
        "⚡ Mapping application user flows to optimise end-to-end experience",
      ],
      softwareSkills: [
        {
          skillName: "Adobe Photoshop",
          fontAwesomeClassname: "simple-icons:adobephotoshop",
          style: { color: "#001732" },
        },
        {
          skillName: "Adobe Illustrator",
          fontAwesomeClassname: "simple-icons:adobeillustrator",
          style: { color: "#310000" },
        },
        {
          skillName: "Adobe XD",
          fontAwesomeClassname: "simple-icons:adobexd",
          style: { color: "#450135" },
        },
        {
          skillName: "Figma",
          fontAwesomeClassname: "simple-icons:figma",
          style: { color: "#F24E1E" },
        },
        {
          skillName: "Canva",
          fontAwesomeClassname: "simple-icons:canva",
          style: { color: "#00C4CC" },
        },
      ],
    },
  ],
};

// Education Page
const competitiveSites = {
  competitiveSites: [
    {
      siteName: "HackerRank",
      iconifyClassname: "simple-icons:hackerrank",
      style: { color: "#2EC866" },
      profileLink: "https://www.hackerrank.com/dmandal1",
    },
    {
      siteName: "GeeksForGeeks",
      iconifyClassname: "simple-icons:geeksforgeeks",
      style: { color: "#2F8D46" },
      profileLink: "https://auth.geeksforgeeks.org/user/dmandal/",
    },
    {
      siteName: "LeetCode",
      iconifyClassname: "simple-icons:leetcode",
      style: { color: "#FFA116" },
      profileLink: "https://leetcode.com/dmandal1/",
    },
    {
      siteName: "Codechef",
      iconifyClassname: "simple-icons:codechef",
      style: { color: "#5B4638" },
      profileLink: "https://www.codechef.com/users/dmandal148",
    },
    {
      siteName: "Codeforces",
      iconifyClassname: "simple-icons:codeforces",
      style: { color: "#1F8ACB" },
      profileLink: "https://codeforces.com/profile/dmandal1",
    },
  ],
};

const degrees = {
  degrees: [
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
    },
  ],
};

const certifications = {
  certifications: [
    {
      title: "JavaScript (Basic) Certificate",
      subtitle: "- HackerRank",
      logo_path: "hackerrank_logo.png",
      certificate_link: "https://www.hackerrank.com/certificates/ce2b03aeef00",
      alt_name: "HackerRank",
      color_code: "#050C18",
    },
    {
      title: "Node (Basic) Certificate",
      subtitle: "- HackerRank",
      logo_path: "hackerrank_logo.png",
      certificate_link: "https://www.hackerrank.com/certificates/b73d3c6e4399",
      alt_name: "HackerRank",
      color_code: "#050C18",
    },
    {
      title: "Digital Marketing",
      subtitle: "- GCP Training",
      logo_path: "google_logo.png",
      certificate_link:
        "https://drive.google.com/file/d/1X_pTvQk7IsGPyu3eKDPqlfCr1Hy8zflZ",
      alt_name: "Google",
      color_code: "#0C9D5899",
    },
    {
      title: "Introduction to JAVA",
      subtitle: "- Coding Ninjas India",
      logo_path: "cn_logo.png",
      certificate_link:
        "https://certificate.codingninjas.com/verify/c3a8bd1f9268f956",
      alt_name: "Coding Ninjas India",
      color_code: "#E7E7E7",
    },
    {
      title: "Data Structures in JAVA",
      subtitle: "- Coding Ninjas India",
      logo_path: "cn_logo.png",
      certificate_link:
        "https://certificate.codingninjas.com/verify/b2057ba196e759c5",
      alt_name: "Coding Ninjas India",
      color_code: "#E7E7E7",
    },
    {
      title: "Nasscom Python",
      subtitle: "- Coding Ninjas India",
      logo_path: "cn_logo.png",
      certificate_link:
        "https://certificate.codingninjas.com/verify/f1ec762b06a7a01c",
      alt_name: "Coding Ninjas India",
      color_code: "#E7E7E7",
    },
    {
      title: "Open Source Development",
      subtitle: "- GirlScript Foundation",
      logo_path: "girlscript_logo.png",
      certificate_link:
        "https://drive.google.com/file/d/1yIZL1tWups3RRjECsBPJLsn1Gpsil3Tn",
      alt_name: "GirlScript Foundation",
      color_code: "#E54B20",
    },
    {
      title: "Front-End Web Development",
      subtitle: "- Coding Ninjas India",
      logo_path: "cn_logo.png",
      certificate_link: "https://www.codingninjas.in/verify/3bea56d89b10436d",
      alt_name: "Coding Ninjas India",
      color_code: "#E7E7E7",
    },
    {
      title: "Back-End with Node.js",
      subtitle: "- Coding Ninjas India",
      logo_path: "cn_logo.png",
      certificate_link: "https://www.codingninjas.in/verify/809b6ed726ce9083",
      alt_name: "Coding Ninjas India",
      color_code: "#E7E7E7",
    },
    {
      title: "Advanced Front-End with React",
      subtitle: "- Coding Ninjas India",
      logo_path: "cn_logo.png",
      certificate_link:
        "https://students.codingninjas.com/verify/2c0effd81a77c37c",
      alt_name: "Coding Ninjas India",
      color_code: "#E7E7E7",
    },
    {
      title: "Database Management System",
      subtitle: "- Coding Ninjas India",
      logo_path: "cn_logo.png",
      certificate_link:
        "https://certificate.codingninjas.com/view/8ca10e7f3f257285",
      alt_name: "Coding Ninjas India",
      color_code: "#E7E7E7",
    },
    {
      title: "HTML5 & CSS3 Fundamentals",
      subtitle: "- Microsoft",
      logo_path: "microsoft_logo.png",
      certificate_link:
        "https://drive.google.com/file/d/1cmUaRdRCF-8DzWFdXKNBQm8Phdgb2F_6",
      alt_name: "Microsoft",
      color_code: "#E18767",
    },
  ],
};

// Experience Page
const experience = {
  title: "Experience",
  subtitle: "Work, Internship and Volunteership",
  description:
    "I have worked with growing startups and enterprises as a Full Stack / Backend Developer and Software Architect. I love building scalable systems and contributing to open-source communities.",
  header_image_path: "experience.svg",
  sections: [
    {
      title: "Work",
      experiences: [
        {
          title: "Senior Associate Consultant",
          company: "Infosys Ltd.",
          company_url: "https://infosys.com/",
          logo_path: "infosys_logo.png",
          duration: "Apr 2026 - Present",
          location: "Noida, India",
          description:
            "Working as a Backend Developer at Infosys, building and maintaining enterprise-grade services using JavaScript, Node.js, Express, MS SQL.",
          color: "#00ACC1",
        },
        {
          title: "Associate Consultant",
          company: "Infosys Ltd.",
          company_url: "https://infosys.com/",
          logo_path: "infosys_logo.png",
          duration: "Sept 2024 - Mar 2026",
          location: "Noida, India",
          description:
            "Working as a Backend Developer at Infosys, building and maintaining enterprise-grade services using JavaScript, Node.js, Express, NestJS, MongoDB, Redis, Sequelize, PostgreSQL, TypeORM, and AWS S3.",
          color: "#0879bf",
        },
        {
          title: "Backend Developer",
          company: "Stulink Pvt. Ltd.",
          company_url: "https://stulink.com/",
          logo_path: "stulink_logo.png",
          duration: "Dec 2023 - Aug 2024",
          location: "Remote, India",
          description:
            "Worked as a Backend Developer on production features for the Stulink platform, using JavaScript, Node.js, Express, MongoDB, Redis, and AWS S3.",
          color: "#279605",
        },
        {
          title: "Associate Software Developer",
          company: "Cloudcraftz Solutions Pvt. Ltd.",
          company_url: "https://www.cloudcraftz.com/",
          logo_path: "cc_logo.png",
          duration: "Oct 2021 - Nov 2023",
          location: "Bangalore, Karnataka, India",
          description:
            "Worked as a Backend Developer on live client projects at Cloudcraftz Solutions, using JavaScript, Node.js, Express.js, and MongoDB to build and ship scalable APIs.",
          color: "#0879bf",
        },
        {
          title: "Software Developer Trainee",
          company: "Cloudcraftz Solutions Pvt. Ltd.",
          company_url: "https://www.cloudcraftz.com/",
          logo_path: "cc_logo.png",
          duration: "Apr 2021 - Sep 2021",
          location: "Bangalore, Karnataka, India",
          description:
            "Trained as a Software Developer, gaining hands-on experience with Java, MySQL, HTML, CSS, and JavaScript while contributing to internal projects.",
          color: "#9b1578",
        },
        {
          title: "Teaching Assistant",
          company: "Coding Ninjas",
          company_url: "https://www.codingninjas.com/",
          logo_path: "cn_logo.png",
          duration: "Dec 2019 - Apr 2020",
          location: "New Delhi, India",
          description:
            "Teaching Assistant for the Career Camp (Full Stack Web Development with Node.js) online batch — resolved student doubts, reviewed code, and guided students through project builds.",
          color: "#fc1f20",
        },
      ],
    },
    {
      title: "Internships",
      experiences: [
        {
          title: "Web Developer Intern",
          company: "Coding Ninjas India",
          company_url: "https://www.codingninjas.com/",
          logo_path: "cn_logo.png",
          duration: "May 2019 - Sept 2019",
          location: "New Delhi, India",
          description:
            "Developed full-stack web projects using JavaScript, Node.js, React.js, Express, and MongoDB as part of the internship programme.",
          color: "#ee3c26",
        },
      ],
    },
    {
      title: "Volunteerships",
      experiences: [
        {
          title: "Campus Ambassador",
          company: "Coding Ninjas",
          company_url: "https://www.codingninjas.com/",
          logo_path: "cn_logo.png",
          duration: "April 2019 - April 2020",
          location: "New Delhi, India",
          description:
            "Led coding awareness at my university under the Coding Ninjas Campus Ambassador programme — organised workshops, hackathons, and seminars to introduce students to programming and web development.",
          color: "#4285F4",
        },
      ],
    },
  ],
};

// Projects Page
const projectsHeader = {
  title: "Projects",
  description:
    "I build full-stack web applications using modern JavaScript technologies. From REST APIs and database design to interactive React UIs — every project reflects my focus on performance, clean code, and developer experience.",
  avatar_image_path: "projects_image.svg",
};

// Open Source (GitHub pinned repos token)
// To show your pinned GitHub repos, encode your GitHub PAT in base64 and set it below.
// Generate a token at https://github.com/settings/tokens (needs 'public_repo' scope).
// Encode: btoa("your_token_here") in browser console, then paste the result.
const openSource = {
  githubConvertedToken: "your_base64_encoded_github_token_here",
  githubUserName: "dmandal1",
};

// Big / Featured Projects
const bigProjects = {
  title: "Featured Projects",
  subtitle: "Startups and companies I have built products for",
  projects: [
    // Add your featured project images and links here.
    // Example:
    // {
    //   image: require("./assests/images/projects/your_project.png"),
    //   link: "https://your-project.com",
    // },
  ],
};


// Blogs
const blogSection = {
  title: "Blogs",
  subtitle:
    "I enjoy writing about software development, clean code practices, and lessons I have learned on the job.",
  blogs: [
    // Add your blog posts here. Example:
    // {
    //   url: "https://your-blog.com/post-1",
    //   title: "Getting started with NestJS",
    //   description: "A beginner-friendly guide to building APIs with NestJS and TypeORM.",
    //   image: "https://your-blog.com/cover.png",
    // },
  ],
};

// Podcast
const podcastSection = {
  title: "Podcast",
  subtitle: "I love talking about technology, software engineering, and career growth.",
  podcast: [
    // Add embeddable podcast URLs here if applicable.
    // Example: "https://open.spotify.com/embed/episode/your_episode_id"
  ],
};

// Contact Page
const contactInfo = {
  title: "Contact Me",
  subtitle:
    "Want to discuss a project, role, or just say hi? My inbox is always open — I will reply within 24 hours.",
  number: "+91-9504243148",
  email_address: "me@deepakmandal.dev",
};

// Keep contactPageData for any legacy usage
const contactPageData = {
  contactSection: {
    title: "Contact Me",
    profile_image_path: "deepak_mandal.jpeg",
    description:
      "I am available on almost every social media. You can message me and I will reply within 24 hours. I can help you with JavaScript, Node.js, React, Express, Cloud, and Open Source Development.",
  },
  blogSection: {
    title: "Blogs",
    subtitle:
      "I write about web development, engineering lessons, and the things I learn building real products.",
    link: "/#/blogs",
    avatar_image_path: "blogs_image.svg",
  },
  addressSection: {
    title: "Address",
    subtitle: "Noida, Uttar Pradesh, India - 201301",
    avatar_image_path: "address_image.svg",
    location_map_link: "https://goo.gl/maps/Cp4tx2eiYvHeXvDN9",
  },
  phoneSection: {
    title: "Phone Number",
    subtitle: "+91-9504243148",
  },
  faqs: [
    {
      q: "What kind of projects are you open to?",
      a: "I'm open to full-stack web and mobile projects, freelance contracts, long-term collaborations, and full-time roles. I work primarily with JavaScript, React, Node.js, and cloud-based architectures.",
    },
    {
      q: "How quickly do you respond?",
      a: "I aim to reply to all messages within 24 hours on weekdays. For urgent matters, reaching out via email is the fastest route.",
    },
    {
      q: "Are you available for remote work?",
      a: "Yes! I'm fully set up for remote work and have collaborated with teams across different time zones. I'm also open to hybrid arrangements in Noida/NCR.",
    },
    {
      q: "Can you help with code reviews or consulting?",
      a: "Absolutely. I'm happy to do one-off consulting sessions, architecture reviews, or help debug tricky problems. Just drop me a message with some context.",
    },
    {
      q: "Do you take on open source contributions?",
      a: "Yes, I actively contribute to open source and welcome collaboration. If you have an interesting project, feel free to reach out.",
    },
  ],
};

export {
  settings,
  seo,
  greeting,
  socialMediaLinks,
  skills,
  competitiveSites,
  degrees,
  certifications,
  experience,
  projectsHeader,
  openSource,
  bigProjects,
  blogSection,
  podcastSection,
  contactInfo,
  contactPageData,
};
