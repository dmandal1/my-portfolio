import React from "react";
import "./Certifications.css";
import { Fade } from "../../components/animations/Reveal";
import CertificationCard from "../../components/certificationCard/CertificationCard";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";
import { certifications as defaultCerts } from "../../portfolio";

export default function Certifications({ theme }) {
  const data = usePortfolioData();
  const certs = data?.certifications ?? defaultCerts.certifications;

  return (
    <div className="main" id="certs">
      <div className="certs-header-div">
        <Fade direction="up" duration={2000}>
          <h1 className="certs-header" style={{ color: theme.text }}>
            Certifications
          </h1>
        </Fade>
      </div>
      <div className="certs-body-div">
        {certs.map((cert) => (
          <CertificationCard key={cert.id || cert.title} certificate={cert} theme={theme} />
        ))}
      </div>
    </div>
  );
}
