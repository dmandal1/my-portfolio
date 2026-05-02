import React from "react";
import { Link } from "react-router-dom";
import profileImg from "../../assests/images/deepak_mandal.jpeg";
import Header from "../../components/header/Header";
import Footer from "../../components/footer/Footer";
import TopButton from "../../components/topButton/TopButton";
import SocialMedia from "../../components/socialMedia/SocialMedia";
import Button from "../../components/button/Button";
import BlogsImg from "./BlogsImg";
import AddressImg from "./AddressImg";
import { Fade } from "../../components/animations/Reveal";
import "./ContactComponent.css";
import { greeting as defaultGreeting, contactPageData as defaultContactPageData } from "../../portfolio.js";
import ContactForm from "../../containers/contactForm/ContactForm";
import QuickContact from "../../containers/contactForm/QuickContact";
import ContactFAQ from "../../containers/contactForm/ContactFAQ";
import { usePortfolioData } from "../../contexts/PortfolioDataContext";
import Newsletter from "../../components/newsletter/Newsletter";

export default function Contact({ theme, onToggle }) {
  const data = usePortfolioData();
  const contactInfo = data?.contactInfo ?? defaultGreeting;
  const cpd         = data?.contactPageData ?? defaultContactPageData;
  const resumeLink  = data?.profile?.resumeLink ?? defaultGreeting.resumeLink;

  const blogSection    = cpd.blogSection    ?? defaultContactPageData.blogSection;
  const addressSection = cpd.addressSection ?? defaultContactPageData.addressSection;
  const phoneSection   = cpd.phoneSection   ?? defaultContactPageData.phoneSection;

  return (
    <div className="contact-main">
      <Header theme={theme} />


      <div className="basic-contact">
        <Fade direction="up" duration={1000}>
          <div className="contact-heading-div">
            <div className="contact-heading-img-div">
              <img src={profileImg} alt="" />
            </div>
            <div className="contact-heading-text-div">
              <h1 className="contact-heading-text" style={{ color: theme.text }}>
                {contactInfo.title}
              </h1>
              <p className="contact-header-detail-text subTitle" style={{ color: theme.secondaryText }}>
                {contactInfo.subtitle}
              </p>
              <SocialMedia theme={theme} />
              <div className="resume-btn-div">
                <Button
                  text="See My Resume"
                  newTab={true}
                  href={resumeLink}
                  theme={theme}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  }
                />
              </div>
              <br /><br />
            </div>
          </div>
        </Fade>

        <Fade direction="up" duration={1000}>
          <div className="blog-heading-div">
            <div className="blog-heading-text-div">
              <h1 className="blog-heading-text" style={{ color: theme.text }}>
                {blogSection.title}
              </h1>
              <p className="blog-header-detail-text subTitle" style={{ color: theme.secondaryText }}>
                {blogSection.subtitle}
              </p>
              <div className="blogsite-btn-div">
                <Button
                  text="Visit My Blogsite"
                  newTab={false}
                  href={blogSection.link}
                  theme={theme}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 19l7-7 3 3-7 7-3-3z" />
                      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                      <path d="M2 2l7.586 7.586" />
                      <circle cx="11" cy="11" r="2" />
                    </svg>
                  }
                />
              </div>
            </div>
            <div className="blog-heading-img-div">
              <BlogsImg theme={theme} />
            </div>
          </div>
        </Fade>

        <Fade direction="up" duration={1000}>
          <div className="address-heading-div">
            <div className="contact-heading-img-div">
              <AddressImg theme={theme} />
            </div>
            <div className="address-heading-text-div">
              <h1 className="address-heading-text" style={{ color: theme.text }}>
                {addressSection.title}
              </h1>
              <p className="contact-header-detail-text subTitle" style={{ color: theme.secondaryText }}>
                {contactInfo.address}
              </p>
              <h1 className="address-heading-text" style={{ color: theme.text }}>
                {phoneSection.title}
              </h1>
              <p className="contact-header-detail-text subTitle" style={{ color: theme.secondaryText }}>
                {contactInfo.number}
              </p>
              <div className="address-btn-div">
                <Button
                  text="Visit on Google Maps"
                  newTab={true}
                  href={addressSection.location_map_link}
                  theme={theme}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  }
                />
              </div>
            </div>
          </div>
        </Fade>
      </div>

      <QuickContact theme={theme} />
      <ContactForm theme={theme} />
      <ContactFAQ theme={theme} />
      <Newsletter theme={theme} />
      <Footer theme={theme} onToggle={onToggle} />
      <TopButton theme={theme} />
    </div>
  );
}
