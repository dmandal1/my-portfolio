import React from "react";
import { Helmet } from "react-helmet-async";
import { seo as defaultSeo } from "../../portfolio.js";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";

function SeoHeader() {
  const data = usePortfolioData();
  const seo = data?.seo || defaultSeo;
  return (
    <Helmet>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta property="og:title" content={seo?.ogTitle || seo?.og?.title} />
      <meta property="og:type" content={seo?.ogType || seo?.og?.type} />
      <meta property="og:url" content={seo?.ogUrl || seo?.og?.url} />
    </Helmet>
  );
}

export default SeoHeader;
