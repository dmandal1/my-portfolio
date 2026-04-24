import React, { Component } from "react";
import "./Organizations.css";
import { Fade } from "../../components/animations/Reveal";
import OrganizationList from "../../components/organizationList/OrganizationList";
import { experience } from "../../portfolio";

function normalizeCompany(name) {
  return name
    .replace(/\s+(India|Pvt\.?\s*Ltd\.?|Ltd\.?|Inc\.?)$/i, "")
    .trim()
    .toLowerCase();
}

const COMPANY_ORDER = [
  "coding ninjas",
  "cloudcraftz solutions",
  "stulink",
  "infosys",
];

function getUniqueCompanies(exp) {
  const seen = new Set();
  const companies = [];
  for (const section of exp.sections) {
    for (const e of section.experiences) {
      const key = normalizeCompany(e.company);
      if (!seen.has(key)) {
        seen.add(key);
        companies.push({
          company: e.company,
          company_url: e.company_url,
          logo_path: e.logo_path,
          _key: key,
        });
      }
    }
  }
  companies.sort((a, b) => {
    const ai = COMPANY_ORDER.indexOf(a._key);
    const bi = COMPANY_ORDER.indexOf(b._key);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  companies.forEach((c) => delete c._key);
  return companies;
}

class Organizations extends Component {
  render() {
    const theme = this.props.theme;
    const companies = getUniqueCompanies(experience);
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
}

export default Organizations;
