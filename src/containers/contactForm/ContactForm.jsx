import React, { useState, useRef, useEffect } from "react";
import emailjs from "@emailjs/browser";
import "./ContactForm.css";
import { Fade } from "../../components/animations/Reveal";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_ALLOWED_CHARS = /^[\d\s\-()\\.]+$/;

const COUNTRY_CODES = [
  { code: "+93",  label: "🇦🇫 Afghanistan (+93)" },
  { code: "+355", label: "🇦🇱 Albania (+355)" },
  { code: "+213", label: "🇩🇿 Algeria (+213)" },
  { code: "+376", label: "🇦🇩 Andorra (+376)" },
  { code: "+244", label: "🇦🇴 Angola (+244)" },
  { code: "+54",  label: "🇦🇷 Argentina (+54)" },
  { code: "+374", label: "🇦🇲 Armenia (+374)" },
  { code: "+61",  label: "🇦🇺 Australia (+61)" },
  { code: "+43",  label: "🇦🇹 Austria (+43)" },
  { code: "+994", label: "🇦🇿 Azerbaijan (+994)" },
  { code: "+1242",label: "🇧🇸 Bahamas (+1242)" },
  { code: "+973", label: "🇧🇭 Bahrain (+973)" },
  { code: "+880", label: "🇧🇩 Bangladesh (+880)" },
  { code: "+375", label: "🇧🇾 Belarus (+375)" },
  { code: "+32",  label: "🇧🇪 Belgium (+32)" },
  { code: "+501", label: "🇧🇿 Belize (+501)" },
  { code: "+229", label: "🇧🇯 Benin (+229)" },
  { code: "+975", label: "🇧🇹 Bhutan (+975)" },
  { code: "+591", label: "🇧🇴 Bolivia (+591)" },
  { code: "+387", label: "🇧🇦 Bosnia & Herzegovina (+387)" },
  { code: "+267", label: "🇧🇼 Botswana (+267)" },
  { code: "+55",  label: "🇧🇷 Brazil (+55)" },
  { code: "+673", label: "🇧🇳 Brunei (+673)" },
  { code: "+359", label: "🇧🇬 Bulgaria (+359)" },
  { code: "+226", label: "🇧🇫 Burkina Faso (+226)" },
  { code: "+257", label: "🇧🇮 Burundi (+257)" },
  { code: "+855", label: "🇰🇭 Cambodia (+855)" },
  { code: "+237", label: "🇨🇲 Cameroon (+237)" },
  { code: "+1",   label: "🇨🇦 Canada (+1)" },
  { code: "+238", label: "🇨🇻 Cape Verde (+238)" },
  { code: "+236", label: "🇨🇫 Central African Republic (+236)" },
  { code: "+235", label: "🇹🇩 Chad (+235)" },
  { code: "+56",  label: "🇨🇱 Chile (+56)" },
  { code: "+86",  label: "🇨🇳 China (+86)" },
  { code: "+57",  label: "🇨🇴 Colombia (+57)" },
  { code: "+269", label: "🇰🇲 Comoros (+269)" },
  { code: "+243", label: "🇨🇩 Congo (DRC) (+243)" },
  { code: "+242", label: "🇨🇬 Congo (Republic) (+242)" },
  { code: "+506", label: "🇨🇷 Costa Rica (+506)" },
  { code: "+385", label: "🇭🇷 Croatia (+385)" },
  { code: "+53",  label: "🇨🇺 Cuba (+53)" },
  { code: "+357", label: "🇨🇾 Cyprus (+357)" },
  { code: "+420", label: "🇨🇿 Czech Republic (+420)" },
  { code: "+45",  label: "🇩🇰 Denmark (+45)" },
  { code: "+253", label: "🇩🇯 Djibouti (+253)" },
  { code: "+1767",label: "🇩🇲 Dominica (+1767)" },
  { code: "+1809",label: "🇩🇴 Dominican Republic (+1809)" },
  { code: "+593", label: "🇪🇨 Ecuador (+593)" },
  { code: "+20",  label: "🇪🇬 Egypt (+20)" },
  { code: "+503", label: "🇸🇻 El Salvador (+503)" },
  { code: "+240", label: "🇬🇶 Equatorial Guinea (+240)" },
  { code: "+291", label: "🇪🇷 Eritrea (+291)" },
  { code: "+372", label: "🇪🇪 Estonia (+372)" },
  { code: "+268", label: "🇸🇿 Eswatini (+268)" },
  { code: "+251", label: "🇪🇹 Ethiopia (+251)" },
  { code: "+679", label: "🇫🇯 Fiji (+679)" },
  { code: "+358", label: "🇫🇮 Finland (+358)" },
  { code: "+33",  label: "🇫🇷 France (+33)" },
  { code: "+241", label: "🇬🇦 Gabon (+241)" },
  { code: "+220", label: "🇬🇲 Gambia (+220)" },
  { code: "+995", label: "🇬🇪 Georgia (+995)" },
  { code: "+49",  label: "🇩🇪 Germany (+49)" },
  { code: "+233", label: "🇬🇭 Ghana (+233)" },
  { code: "+30",  label: "🇬🇷 Greece (+30)" },
  { code: "+1473",label: "🇬🇩 Grenada (+1473)" },
  { code: "+502", label: "🇬🇹 Guatemala (+502)" },
  { code: "+224", label: "🇬🇳 Guinea (+224)" },
  { code: "+245", label: "🇬🇼 Guinea-Bissau (+245)" },
  { code: "+592", label: "🇬🇾 Guyana (+592)" },
  { code: "+509", label: "🇭🇹 Haiti (+509)" },
  { code: "+504", label: "🇭🇳 Honduras (+504)" },
  { code: "+36",  label: "🇭🇺 Hungary (+36)" },
  { code: "+354", label: "🇮🇸 Iceland (+354)" },
  { code: "+91",  label: "🇮🇳 India (+91)" },
  { code: "+62",  label: "🇮🇩 Indonesia (+62)" },
  { code: "+98",  label: "🇮🇷 Iran (+98)" },
  { code: "+964", label: "🇮🇶 Iraq (+964)" },
  { code: "+353", label: "🇮🇪 Ireland (+353)" },
  { code: "+972", label: "🇮🇱 Israel (+972)" },
  { code: "+39",  label: "🇮🇹 Italy (+39)" },
  { code: "+1876",label: "🇯🇲 Jamaica (+1876)" },
  { code: "+81",  label: "🇯🇵 Japan (+81)" },
  { code: "+962", label: "🇯🇴 Jordan (+962)" },
  { code: "+7",   label: "🇰🇿 Kazakhstan (+7)" },
  { code: "+254", label: "🇰🇪 Kenya (+254)" },
  { code: "+686", label: "🇰🇮 Kiribati (+686)" },
  { code: "+383", label: "🇽🇰 Kosovo (+383)" },
  { code: "+965", label: "🇰🇼 Kuwait (+965)" },
  { code: "+996", label: "🇰🇬 Kyrgyzstan (+996)" },
  { code: "+856", label: "🇱🇦 Laos (+856)" },
  { code: "+371", label: "🇱🇻 Latvia (+371)" },
  { code: "+961", label: "🇱🇧 Lebanon (+961)" },
  { code: "+266", label: "🇱🇸 Lesotho (+266)" },
  { code: "+231", label: "🇱🇷 Liberia (+231)" },
  { code: "+218", label: "🇱🇾 Libya (+218)" },
  { code: "+423", label: "🇱🇮 Liechtenstein (+423)" },
  { code: "+370", label: "🇱🇹 Lithuania (+370)" },
  { code: "+352", label: "🇱🇺 Luxembourg (+352)" },
  { code: "+261", label: "🇲🇬 Madagascar (+261)" },
  { code: "+265", label: "🇲🇼 Malawi (+265)" },
  { code: "+60",  label: "🇲🇾 Malaysia (+60)" },
  { code: "+960", label: "🇲🇻 Maldives (+960)" },
  { code: "+223", label: "🇲🇱 Mali (+223)" },
  { code: "+356", label: "🇲🇹 Malta (+356)" },
  { code: "+692", label: "🇲🇭 Marshall Islands (+692)" },
  { code: "+222", label: "🇲🇷 Mauritania (+222)" },
  { code: "+230", label: "🇲🇺 Mauritius (+230)" },
  { code: "+52",  label: "🇲🇽 Mexico (+52)" },
  { code: "+691", label: "🇫🇲 Micronesia (+691)" },
  { code: "+373", label: "🇲🇩 Moldova (+373)" },
  { code: "+377", label: "🇲🇨 Monaco (+377)" },
  { code: "+976", label: "🇲🇳 Mongolia (+976)" },
  { code: "+382", label: "🇲🇪 Montenegro (+382)" },
  { code: "+212", label: "🇲🇦 Morocco (+212)" },
  { code: "+258", label: "🇲🇿 Mozambique (+258)" },
  { code: "+95",  label: "🇲🇲 Myanmar (+95)" },
  { code: "+264", label: "🇳🇦 Namibia (+264)" },
  { code: "+674", label: "🇳🇷 Nauru (+674)" },
  { code: "+977", label: "🇳🇵 Nepal (+977)" },
  { code: "+31",  label: "🇳🇱 Netherlands (+31)" },
  { code: "+64",  label: "🇳🇿 New Zealand (+64)" },
  { code: "+505", label: "🇳🇮 Nicaragua (+505)" },
  { code: "+227", label: "🇳🇪 Niger (+227)" },
  { code: "+234", label: "🇳🇬 Nigeria (+234)" },
  { code: "+389", label: "🇲🇰 North Macedonia (+389)" },
  { code: "+47",  label: "🇳🇴 Norway (+47)" },
  { code: "+968", label: "🇴🇲 Oman (+968)" },
  { code: "+92",  label: "🇵🇰 Pakistan (+92)" },
  { code: "+680", label: "🇵🇼 Palau (+680)" },
  { code: "+970", label: "🇵🇸 Palestine (+970)" },
  { code: "+507", label: "🇵🇦 Panama (+507)" },
  { code: "+675", label: "🇵🇬 Papua New Guinea (+675)" },
  { code: "+595", label: "🇵🇾 Paraguay (+595)" },
  { code: "+51",  label: "🇵🇪 Peru (+51)" },
  { code: "+63",  label: "🇵🇭 Philippines (+63)" },
  { code: "+48",  label: "🇵🇱 Poland (+48)" },
  { code: "+351", label: "🇵🇹 Portugal (+351)" },
  { code: "+974", label: "🇶🇦 Qatar (+974)" },
  { code: "+40",  label: "🇷🇴 Romania (+40)" },
  { code: "+7",   label: "🇷🇺 Russia (+7)" },
  { code: "+250", label: "🇷🇼 Rwanda (+250)" },
  { code: "+1869",label: "🇰🇳 Saint Kitts & Nevis (+1869)" },
  { code: "+1758",label: "🇱🇨 Saint Lucia (+1758)" },
  { code: "+1784",label: "🇻🇨 Saint Vincent (+1784)" },
  { code: "+685", label: "🇼🇸 Samoa (+685)" },
  { code: "+378", label: "🇸🇲 San Marino (+378)" },
  { code: "+239", label: "🇸🇹 São Tomé & Príncipe (+239)" },
  { code: "+966", label: "🇸🇦 Saudi Arabia (+966)" },
  { code: "+221", label: "🇸🇳 Senegal (+221)" },
  { code: "+381", label: "🇷🇸 Serbia (+381)" },
  { code: "+248", label: "🇸🇨 Seychelles (+248)" },
  { code: "+232", label: "🇸🇱 Sierra Leone (+232)" },
  { code: "+65",  label: "🇸🇬 Singapore (+65)" },
  { code: "+421", label: "🇸🇰 Slovakia (+421)" },
  { code: "+386", label: "🇸🇮 Slovenia (+386)" },
  { code: "+677", label: "🇸🇧 Solomon Islands (+677)" },
  { code: "+252", label: "🇸🇴 Somalia (+252)" },
  { code: "+27",  label: "🇿🇦 South Africa (+27)" },
  { code: "+211", label: "🇸🇸 South Sudan (+211)" },
  { code: "+34",  label: "🇪🇸 Spain (+34)" },
  { code: "+94",  label: "🇱🇰 Sri Lanka (+94)" },
  { code: "+249", label: "🇸🇩 Sudan (+249)" },
  { code: "+597", label: "🇸🇷 Suriname (+597)" },
  { code: "+46",  label: "🇸🇪 Sweden (+46)" },
  { code: "+41",  label: "🇨🇭 Switzerland (+41)" },
  { code: "+963", label: "🇸🇾 Syria (+963)" },
  { code: "+886", label: "🇹🇼 Taiwan (+886)" },
  { code: "+992", label: "🇹🇯 Tajikistan (+992)" },
  { code: "+255", label: "🇹🇿 Tanzania (+255)" },
  { code: "+66",  label: "🇹🇭 Thailand (+66)" },
  { code: "+670", label: "🇹🇱 Timor-Leste (+670)" },
  { code: "+228", label: "🇹🇬 Togo (+228)" },
  { code: "+676", label: "🇹🇴 Tonga (+676)" },
  { code: "+1868",label: "🇹🇹 Trinidad & Tobago (+1868)" },
  { code: "+216", label: "🇹🇳 Tunisia (+216)" },
  { code: "+90",  label: "🇹🇷 Turkey (+90)" },
  { code: "+993", label: "🇹🇲 Turkmenistan (+993)" },
  { code: "+688", label: "🇹🇻 Tuvalu (+688)" },
  { code: "+256", label: "🇺🇬 Uganda (+256)" },
  { code: "+380", label: "🇺🇦 Ukraine (+380)" },
  { code: "+971", label: "🇦🇪 United Arab Emirates (+971)" },
  { code: "+44",  label: "🇬🇧 United Kingdom (+44)" },
  { code: "+1",   label: "🇺🇸 United States (+1)" },
  { code: "+598", label: "🇺🇾 Uruguay (+598)" },
  { code: "+998", label: "🇺🇿 Uzbekistan (+998)" },
  { code: "+678", label: "🇻🇺 Vanuatu (+678)" },
  { code: "+58",  label: "🇻🇪 Venezuela (+58)" },
  { code: "+84",  label: "🇻🇳 Vietnam (+84)" },
  { code: "+967", label: "🇾🇪 Yemen (+967)" },
  { code: "+260", label: "🇿🇲 Zambia (+260)" },
  { code: "+263", label: "🇿🇼 Zimbabwe (+263)" },
];

const EMPTY_FORM = { name: "", email: "", countryCode: "+1", phone: "", subject: "", message: "" };
const EMPTY_ERRORS = { name: "", email: "", phone: "", subject: "", message: "" };

function validate(form) {
  const errors = { ...EMPTY_ERRORS };
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else {
    const digits = form.phone.replace(/\D/g, "");
    if (!PHONE_ALLOWED_CHARS.test(form.phone.trim())) {
      errors.phone = "Only digits, spaces, dashes, and parentheses are allowed.";
    } else if (digits.length < 6) {
      errors.phone = "Phone number must have at least 6 digits.";
    } else if (digits.length > 15) {
      errors.phone = "Phone number must have at most 15 digits.";
    }
  }
  if (!form.subject.trim()) errors.subject = "Subject is required.";
  if (!form.message.trim()) errors.message = "Message is required.";
  return errors;
}

function hasErrors(errors) {
  return Object.values(errors).some(Boolean);
}

function PhoneCountrySelect({ value, onChange, theme }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef();
  const searchRef = useRef();

  const selected = COUNTRY_CODES.find((c) => c.label.includes(value) && c.code === value)
    || COUNTRY_CODES.find((c) => c.code === value)
    || COUNTRY_CODES[0];
  const selectedFlag = selected.label.split(" ")[0];

  const filtered = COUNTRY_CODES.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search)
  );

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchRef.current) searchRef.current.focus();
  }, [isOpen]);

  function handleSelect(code) {
    onChange(code);
    setIsOpen(false);
    setSearch("");
  }

  return (
    <div className="phone-country-dropdown" ref={containerRef}>
      <input type="hidden" name="countryCode" value={value} />
      <button
        type="button"
        className="phone-country-trigger"
        onClick={() => setIsOpen((o) => !o)}
        style={{ color: theme.text }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedFlag} {value}</span>
        <span className={`dropdown-arrow${isOpen ? " open" : ""}`}>▾</span>
      </button>
      {isOpen && (
        <div
          className="phone-country-menu"
          style={{ background: theme.body || "#fff", borderColor: theme.imageDark }}
          role="listbox"
        >
          <div className="phone-country-search-wrap" style={{ borderColor: theme.imageDark }}>
            <span className="search-icon">🔍</span>
            <input
              ref={searchRef}
              id="cf-country-search"
              name="countrySearch"
              type="text"
              className="phone-country-search"
              placeholder="Search country or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              aria-label="Search country codes"
              style={{ color: theme.text }}
            />
            {search && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearch("")}
                style={{ color: theme.secondaryText }}
              >✕</button>
            )}
          </div>
          <ul className="phone-country-list">
            {filtered.length > 0 ? filtered.map(({ code, label }) => {
              const flag = label.split(" ")[0];
              const name = label.replace(/^[^ ]+ /, "").replace(/ \(.*\)$/, "");
              return (
                <li
                  key={label}
                  className={`phone-country-item${code === value && label === selected.label ? " active" : ""}`}
                  onClick={() => handleSelect(code)}
                  role="option"
                  aria-selected={code === value}
                  style={{ color: theme.text }}
                >
                  <span className="item-flag">{flag}</span>
                  <span className="item-name" style={{ color: theme.text }}>{name}</span>
                  <span className="item-code" style={{ color: theme.secondaryText }}>{code}</span>
                </li>
              );
            }) : (
              <li className="phone-country-no-results" style={{ color: theme.secondaryText }}>
                No countries found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ContactForm({ theme }) {
  const formRef = useRef();
  const detectedCodeRef = useRef("+1");
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [touched, setTouched] = useState(EMPTY_ERRORS);
  const [status, setStatus] = useState(null); // null | "sending" | "success" | "error"

  useEffect(() => {
    // Avoid IP geo lookups (CORS/429 issues on many hosts). Instead, use browser locale as a best-effort hint.
    const lang = typeof navigator !== "undefined" ? navigator.language || "" : "";
    const region = (lang.split("-")[1] || "").toUpperCase();
    const byRegion = {
      IN: "+91",
      US: "+1",
      CA: "+1",
      GB: "+44",
      AU: "+61",
      NZ: "+64",
      DE: "+49",
      FR: "+33",
      ES: "+34",
      IT: "+39",
      NL: "+31",
      BR: "+55",
      MX: "+52",
      AE: "+971",
      SA: "+966",
      SG: "+65",
      JP: "+81",
      KR: "+82",
    };
    const guessed = byRegion[region] || "+1";
    const match = COUNTRY_CODES.find((c) => c.code === guessed);
    if (match) {
      detectedCodeRef.current = match.code;
      setForm((prev) => (prev.countryCode === "+1" ? { ...prev, countryCode: match.code } : prev));
    }
  }, []);

  useEffect(() => {
    if (status === "success" || status === "error") {
      const timer = setTimeout(() => setStatus(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  function handleChange(e) {
    const updated = { ...form, [e.target.name]: e.target.value };
    setForm(updated);
    if (touched[e.target.name]) {
      setErrors(validate(updated));
    }
  }

  function handleBlur(e) {
    const updatedTouched = { ...touched, [e.target.name]: true };
    setTouched(updatedTouched);
    setErrors(validate(form));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const allTouched = { name: true, email: true, phone: true, subject: true, message: true };
    setTouched(allTouched);
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (hasErrors(validationErrors)) return;

    setStatus("sending");

    emailjs
      .sendForm(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        formRef.current,
        import.meta.env.VITE_EMAILJS_USER_ID
      )
      .then(() => {
        setStatus("success");
        setForm({ ...EMPTY_FORM, countryCode: detectedCodeRef.current });
        setTouched(EMPTY_ERRORS);
        setErrors(EMPTY_ERRORS);
      })
      .catch((err) => {
        console.error("EmailJS error:", err);
        setStatus("error");
      });
  }

  return (
    <Fade direction="up" duration={1000}>
      <div className="contact-form-section">
        <h1 className="contact-form-title" style={{ color: theme.text }}>
          Get In Touch
        </h1>
        <p className="contact-form-subtitle" style={{ color: theme.secondaryText }}>
          Have a project in mind or just want to say hi? Fill out the form below!
        </p>
        <form ref={formRef} className="contact-form" onSubmit={handleSubmit} noValidate>
          <div className="contact-form-row">
            <div className="contact-form-group">
              <label htmlFor="cf-name" style={{ color: theme.secondaryText }}>
                Name <span className="required-star">*</span>
              </label>
              <input
                id="cf-name"
                type="text"
                name="name"
                placeholder="Your name"
                value={form.name}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="name"
                className={errors.name && touched.name ? "input-error" : ""}
                style={{ borderColor: errors.name && touched.name ? "#c62828" : theme.imageDark, color: theme.text }}
              />
              {errors.name && touched.name && (
                <span className="field-error">{errors.name}</span>
              )}
            </div>
            <div className="contact-form-group">
              <label htmlFor="cf-email" style={{ color: theme.secondaryText }}>
                Email <span className="required-star">*</span>
              </label>
              <input
                id="cf-email"
                type="email"
                name="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="email"
                className={errors.email && touched.email ? "input-error" : ""}
                style={{ borderColor: errors.email && touched.email ? "#c62828" : theme.imageDark, color: theme.text }}
              />
              {errors.email && touched.email && (
                <span className="field-error">{errors.email}</span>
              )}
            </div>
          </div>
          <div className="contact-form-row">
            <div className="contact-form-group">
              <label htmlFor="cf-phone" style={{ color: theme.secondaryText }}>
                Phone <span className="required-star">*</span>
              </label>
              <div
                className={`phone-input-wrapper${errors.phone && touched.phone ? " input-error" : ""}`}
                style={{ borderColor: errors.phone && touched.phone ? "#c62828" : theme.imageDark }}
              >
                <PhoneCountrySelect
                  value={form.countryCode}
                  onChange={(code) => setForm((prev) => ({ ...prev, countryCode: code }))}
                  theme={theme}
                />
                <span className="phone-divider" />
                <input
                  id="cf-phone"
                  type="tel"
                  name="phone"
                  placeholder="555 000-0000"
                  value={form.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="tel-national"
                  className="phone-number-input"
                  style={{ color: theme.text }}
                />
              </div>
              {/* Hidden field sends the full number to EmailJS */}
              <input
                type="hidden"
                name="full_phone"
                value={form.phone ? `${form.countryCode} ${form.phone}` : ""}
              />
              {errors.phone && touched.phone && (
                <span className="field-error">{errors.phone}</span>
              )}
            </div>
            <div className="contact-form-group">
              <label htmlFor="cf-subject" style={{ color: theme.secondaryText }}>
                Subject <span className="required-star">*</span>
              </label>
              <input
                id="cf-subject"
                type="text"
                name="subject"
                placeholder="What's this about?"
                value={form.subject}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="off"
                className={errors.subject && touched.subject ? "input-error" : ""}
                style={{ borderColor: errors.subject && touched.subject ? "#c62828" : theme.imageDark, color: theme.text }}
              />
              {errors.subject && touched.subject && (
                <span className="field-error">{errors.subject}</span>
              )}
            </div>
          </div>
          <div className="contact-form-group">
            <label htmlFor="cf-message" style={{ color: theme.secondaryText }}>
              Message <span className="required-star">*</span>
            </label>
            <textarea
              id="cf-message"
              name="message"
              rows={5}
              placeholder="Write your message here..."
              value={form.message}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="off"
              className={errors.message && touched.message ? "input-error" : ""}
              style={{ borderColor: errors.message && touched.message ? "#c62828" : theme.imageDark, color: theme.text }}
            />
            {errors.message && touched.message && (
              <span className="field-error">{errors.message}</span>
            )}
          </div>
          <button
            type="submit"
            className="contact-form-btn"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending…" : "Send Message"}
          </button>
          {status === "success" && (
            <p className="contact-form-feedback success">
              Thanks! Your message has been sent.
            </p>
          )}
          {status === "error" && (
            <p className="contact-form-feedback error">
              Something went wrong. Please try again or email me directly.
            </p>
          )}
        </form>
      </div>
    </Fade>
  );
}
