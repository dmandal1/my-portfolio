import React from "react";
import "./Organizations.css";
import { Fade } from "../../components/animations/Reveal";
import OrganizationList from "../../components/organizationList/OrganizationList";
import { experience as defaultExperience } from "../../portfolio";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";

function normalizeCompany(name) {
  return name
    .replace(/\s+(India|Pvt\.?\s*Ltd\.?|Ltd\.?|Inc\.?)$/i, "")
    .trim()
    .toLowerCase();
}

function getUniqueCompanies(sections) {
  const seen = new Set();
  const companies = [];
  for (const section of sections) {
    for (const e of section.experiences) {
      const key = normalizeCompany(e.company);
      if (!seen.has(key)) {
        seen.add(key);
        companies.push({
          company: e.company,
          company_url: e.company_url,
          logo_path: e.logo_path,
        });
      }
    }
  }
  return companies;
}

export default function Organizations({ theme }) {
  const data = usePortfolioData();
  const sections = data?.experiences?.length > 0
    ? data.experiences
    : defaultExperience.sections;
  const companies = getUniqueCompanies(sections);

  return (
    <div id="organizations">
      <div className="organizations-header-div">
        <Fade direction="up" duration={2000}>
          <h1 className="organizations-header" style={{ color: theme.text }}>
            Contributed Organizations
          </h1>
        </Fade>
      </div>
      <OrganizationList logos={companies} />
    </div>
  );
}
