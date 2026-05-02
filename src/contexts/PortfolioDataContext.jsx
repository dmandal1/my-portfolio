import { createContext, useContext, useEffect, useState } from "react";
import {
  greeting as defaultProfile,
  seo as defaultSeo,
  socialMediaLinks as defaultSocialLinks,
  contactInfo as defaultContactInfo,
  contactPageData as defaultContactPageData,
  degrees as defaultDegrees,
  competitiveSites as defaultCompetitiveSites,
  bigProjects as defaultBigProjects,
  skills as defaultSkills,
  certifications as defaultCertifications,
  experience as defaultExperience,
  projectsHeader as defaultProjectsHeader,
  openSource as defaultOpenSource,
  blogSection as defaultBlogSection,
  podcastSection as defaultPodcastSection,
} from "../portfolio";
import {
  getPortfolioProfile,
  getPortfolioSeo,
  getPortfolioContact,
  getSocialLinks,
  getEducation,
  getCompetitiveSites,
  getPortfolioProjects,
  getSkillGroups,
  getCertifications,
  getExperiences,
  getExperienceHeader,
  getContactPageData,
  getProjectsHeader,
  getOpenSourceConfig,
  getPodcastSection,
  getBlogSectionConfig,
  getMenuLinks,
} from "../api/apiService";

const PortfolioDataContext = createContext(null);

export function PortfolioDataProvider({ children }) {
  const [data, setData] = useState({
    profile:          defaultProfile,
    seo:              defaultSeo,
    socialLinks:      defaultSocialLinks,
    contactInfo:      defaultContactInfo,
    contactPageData:  defaultContactPageData,
    degrees:          defaultDegrees.degrees,
    competitiveSites: defaultCompetitiveSites.competitiveSites,
    projects:         defaultBigProjects,
    skills:           defaultSkills.data,
    certifications:   defaultCertifications.certifications,
    experiences:      defaultExperience.sections,
    experienceHeader: {
      title:       defaultExperience.title,
      subtitle:    defaultExperience.subtitle,
      description: defaultExperience.description,
    },
    projectsHeader:   defaultProjectsHeader,
    openSource:       defaultOpenSource,
    podcastSection:   defaultPodcastSection,
    blogSectionConfig: defaultBlogSection,
  });

  useEffect(() => {
    if (window.location.hash.startsWith("#/install")) return;

    async function load() {
      try {
        const [
          profile, seo, contactInfo, socialLinks,
          degrees, competitive, projects, skills,
          certifications, experiences, experienceHeader,
          contactPageData, projectsHeader,
          openSource, podcastSection, blogSectionConfig, menuLinks,
        ] = await Promise.all([
          getPortfolioProfile(),
          getPortfolioSeo(),
          getPortfolioContact(),
          getSocialLinks(),
          getEducation(),
          getCompetitiveSites(),
          getPortfolioProjects(),
          getSkillGroups(),
          getCertifications(),
          getExperiences(),
          getExperienceHeader(),
          getContactPageData(),
          getProjectsHeader(),
          getOpenSourceConfig(),
          getPodcastSection(),
          getBlogSectionConfig(),
          getMenuLinks(),
        ]);

        // Build experience sections from flat array
        const EXP_ORDER = ["Work", "Internships", "Volunteerships"];
        let expSections = defaultExperience.sections;
        if (experiences?.length > 0) {
          const map = {};
          experiences.forEach((e) => {
            const sec = e.section || "Work";
            if (!map[sec]) map[sec] = [];
            map[sec].push(e);
          });
          expSections = EXP_ORDER.filter((s) => map[s]?.length > 0).map((s) => ({ title: s, experiences: map[s] }));
        }

        const defaultMenuLinks = [
          { to: "/home",       label: "Home" },
          { to: "/education",  label: "Education" },
          { to: "/experience", label: "Experience" },
          { to: "/projects",   label: "Projects" },
          { to: "/blogs",      label: "Blogs" },
          { to: "/opensource", label: "Open Source" },
          { to: "/contact",    label: "Contact Me" },
        ];

        setData({
          profile:         profile         || defaultProfile,
          seo:             seo             || defaultSeo,
          contactInfo:     contactInfo     || defaultContactInfo,
          socialLinks:     socialLinks?.length  > 0 ? socialLinks  : defaultSocialLinks,
          degrees:         degrees?.length       > 0 ? degrees       : defaultDegrees.degrees,
          competitiveSites:competitive?.length   > 0 ? competitive   : defaultCompetitiveSites.competitiveSites,
          projects:        projects?.length      > 0 ? { ...defaultBigProjects, projects } : defaultBigProjects,
          skills:          skills?.length        > 0 ? skills        : defaultSkills.data,
          certifications:  certifications?.length > 0 ? certifications : defaultCertifications.certifications,
          experiences:     expSections,
          experienceHeader: experienceHeader || {
            title:       defaultExperience.title,
            subtitle:    defaultExperience.subtitle,
            description: defaultExperience.description,
          },
          contactPageData:  contactPageData  || defaultContactPageData,
          projectsHeader:   projectsHeader   || defaultProjectsHeader,
          openSource:       openSource       || defaultOpenSource,
          podcastSection:   podcastSection   || defaultPodcastSection,
          blogSectionConfig: blogSectionConfig || defaultBlogSection,
          menuLinks:        menuLinks?.length > 0 ? menuLinks : defaultMenuLinks,
        });
      } catch { /* keep portfolio.js defaults on any error */ }
    }
    load();
  }, []);

  return (
    <PortfolioDataContext.Provider value={data}>
      {children}
    </PortfolioDataContext.Provider>
  );
}

export const usePortfolioData = () => useContext(PortfolioDataContext);
