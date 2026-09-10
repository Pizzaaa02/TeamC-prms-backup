/**
 * WebsiteCustomizer page component.
 *
 * Provides a split-panel UI:
 *   Left  – live preview of the website header, body, footer
 *   Right – property editor for the five elements:
 *     1. title
 *     2. description
 *     3. background_color
 *     4. logo_url
 *     5. company_name
 *
 * All changes are pushed to the backend via the /customizer REST
 * endpoints (adminApi) and reflected instantly in the preview.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { adminApi } from "../api";
import "./WebsiteCustomizer.css";

// ------ section management ------
const STATIC_HEADER_BG = { backgroundColor: "#FFFFFF" };
const STATIC_FOOTER_BG = { backgroundColor: "#F3F4F6" };

const DEFAULT_SECTIONS = {
  hero: { text: "Hero Section", visibility: true, lock: false },
  search_bar: { text: "Search Bar", visibility: true, lock: false },
  featured: { text: "Featured Properties", visibility: true, lock: false },
  features: { text: "Our Features", visibility: true, lock: false },
  testimonials: { text: "Testimonials", visibility: true, lock: false },
  cta_section: { text: "Call to Action", visibility: true, lock: false },
  footer: { text: "Footer", visibility: true, lock: false },
};

async function fetchConfig() {
  const { data } = await adminApi.getCustomizerConfig();
  return data;
}

async function patchField(field, value) {
  const { data } = await adminApi.patchCustomizerField(field, value);
  return data;
}

async function generateHtmlPreview() {
  const { data } = await adminApi.generateCustomizerHtml();
  return URL.createObjectURL(data);
}

async function resetConfig() {
  const { data } = await adminApi.resetCustomizerConfig();
  return data;
}

// ---------- Color picker input ----------

const COLOR_INPUT_TEXT_WIDTH = { width: 90 };

function ColorInput({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="wc-color-input">
      <label>{label}</label>
      <div className="wc-color-row">
        <input
          type="color"
          value={value || "#F3F6FB"}
          onChange={(e) => onChange(e.target.value)}
          onClick={() => setOpen(true)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            if (!value) open && setOpen(false);
          }}
          className="wc-color-picker"
        />
        <span
          className="wc-color-text"
          data-color={value || "#F3F6FB"}
          onClick={() => {
            document.getElementById("wc-color-field")?.focus();
          }}
        >
          {value || "#F3F6FB"}
        </span>
        <input
          id="wc-color-field"
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="wc-color-compact"
          placeholder="#F3F6FB"
          style={COLOR_INPUT_TEXT_WIDTH}
        />
      </div>
    </div>
  );
}

// ---------- Logo URL input ----------

function LogoInput({ value, onChange }) {
  const [previewUrl, setPreviewUrl] = useState(value);

  useEffect(() => {
    if (value) setPreviewUrl(value);
  }, [value]);

  function onFieldChange(newUrl) {
    onChange(newUrl);
    if (newUrl) {
      const img = document.createElement("img");
      img.src = newUrl;
      img.onload = () => setPreviewUrl(newUrl);
      img.onerror = () => setPreviewUrl("");
    }
  }

  // Sample image sources for the preview
  const SAMPLE_IMAGES = [
    "https://images.unsplash.com/photo-1503387762-592deb58efb5",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c",
  ];

  return (
    <div className="wc-text-input">
      <label>Logo Image</label>
      <input
        type="url"
        value={value || ""}
        onChange={(e) => onFieldChange(e.target.value)}
        placeholder="https://example.com/logo.png"
      />
      <div className="wc-preview-bar">
        {previewUrl ? (
          <img src={previewUrl} alt="logo preview" className="wc-logo-preview" />
        ) : (
          <span className="wc-preview-placeholder">No logo</span>
        )}
        <div className="wc-sample-images">
          {SAMPLE_IMAGES.map((src, i) => (
            <button
              key={i}
              className="wc-sample"
              type="button"
              onClick={() => onFieldChange(src)}
            >
              <img src={src} alt={`sample ${i + 1}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Live preview ----------

function LivePreview({ config, onElementClick }) {
  const bg = config.background_color || "#F3F6FB";
  const logoUrl = config.logo_url || "";

  // Build a CSS class to highlight the clicked preview section
  const [highlight, setHighlight] = useState("");

  function sectionClick(section) {
    setHighlight(section);
    setTimeout(() => setHighlight(""), 1200);
    onElementClick && onElementClick(section);
  }

  return (
    <div className="wc-preview-area">
      <div className={`wc-preview-section ${highlight === "header" ? "wc-highlight" : ""} wc-section-header`} onClick={() => sectionClick("header")}>
        <div className="wc-header-bar" style={STATIC_HEADER_BG}>
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="wc-preview-logo" />
          )}
          <span className="wc-header-brand">{config.title || "PRMS"}</span>
        </div>
      </div>
      <div className={`wc-preview-section ${highlight === "body" ? "wc-highlight" : ""} wc-section-body`} onClick={() => sectionClick("body")}>
        <div className="wc-body-content" style={{ backgroundColor: bg }}>
          <h1 className="wc-preview-title">{config.title || "PRMS"}</h1>
          <p className="wc-preview-description">{config.description || "Property Rental Management System"}</p>
        </div>
      </div>
      <div className={`wc-preview-section ${highlight === "footer" ? "wc-highlight" : ""} wc-section-footer`} onClick={() => sectionClick("footer")}>
        <div className="wc-footer-bar" style={STATIC_FOOTER_BG}>
          <span className="wc-footer-brand">{config.company_name || "Property Rental Management System"}</span>
        </div>
      </div>

      {/* Inline property indicators */}
      <div className="wc-props-indicator">
        <div className={`wc-prop ${config.title ? "wc-prop-ok" : "wc-prop-muted"}`}>
          <span className="wc-prop-dot wc-prop-dot-title"></span>
          Title:{" "}
          <strong data-testid="prop-title">{config.title || "PRMS"}</strong>
        </div>
        <div className={`wc-prop ${config.description ? "wc-prop-ok" : "wc-prop-muted"}`}>
          <span className="wc-prop-dot wc-prop-dot-desc"></span>
          Description:{" "}
          <strong data-testid="prop-desc">
            {config.description || "–"}
          </strong>
        </div>
        <div className="wc-prop">
          <span className="wc-prop-dot wc-prop-dot-bg"></span>
          Background:{" "}
          <strong data-testid="prop-bg">{config.background_color || "#F3F6FB"}</strong>
        </div>
        <div className="wc-prop">
          <span className="wc-prop-dot wc-prop-dot-logo"></span>
          Logo:{" "}
          <strong data-testid="prop-logo">
            {config.logo_url || "–"}
          </strong>
        </div>
        <div className="wc-prop">
          <span className="wc-prop-dot wc-prop-dot-name"></span>
          Company:{" "}
          <strong data-testid="prop-company">
            {config.company_name || "Property Rental Management System"}
          </strong>
        </div>
      </div>
    </div>
  );
}

// ---------- Main component ----------

export default function WebsiteCustomizer({ config: initialConfig, onConfigChange }) {
  const [config, setConfig] = useState(initialConfig || {
    title: "PRMS",
    description: "Property Rental Management System",
    background_color: "#F3F6FB",
    logo_url: "",
    company_name: "Property Rental Management System",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [htmlUrl, setHtmlUrl] = useState(null);

  // Load config from Flask API on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchConfig();
        if (!cancelled) {
          setConfig(data);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Update child config when local state changes
  useEffect(() => {
    onConfigChange && onConfigChange(config);
  }, [config, onConfigChange]);

  const handleFieldChange = useCallback(
    async (field, value) => {
      setSaving(true);
      try {
        const data = await patchField(field, value);
        setConfig((prev) => ({ ...prev, [field]: value }));
      } catch (err) {
        setError(`Failed to update ${field}: ${err.message}`);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const handleTitleChange = (value) => handleFieldChange("title", value);
  const handleDescriptionChange = (value) => handleFieldChange("description", value);
  const handleBgColorChange = (value) => handleFieldChange("background_color", value);
  const handleLogoChange = (value) => handleFieldChange("logo_url", value);
  const handleCompanyNameChange = (value) => handleFieldChange("company_name", value);

  const handleReset = async () => {
    setSaving(true);
    try {
      const data = await resetConfig();
      setConfig(data);
    } catch (err) {
      setError(`Reset failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateHtml = async () => {
    setSaving(true);
    try {
      const url = await generateHtmlPreview();
      setHtmlUrl(url);
      window.open(url, "_blank");
    } catch (err) {
      setError(`Generate HTML failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="wc-page" data-testid="wc-loading">
        <div className="wc-spinner"></div>
        <p>Loading Customizer...</p>
      </div>
    );
  }

  return (
    <div className="wc-page" data-testid="wc-page">
      <header className="wc-page-header">
        <h1 className="wc-page-title">Website Customizer</h1>
        <p className="wc-page-subtitle">
          Customize the look and feel of your public-facing website.
        </p>
        <div className="wc-header-actions">
          <button
            type="button"
            className="wc-button wc-button-secondary"
            onClick={handleReset}
            disabled={saving}
            title="Reset all fields to defaults"
          >
            Reset
          </button>
          <button
            type="button"
            className="wc-button wc-button-primary"
            onClick={handleGenerateHtml}
            disabled={saving}
            title="Generate HTML preview"
          >
            Generate HTML
          </button>
        </div>
      </header>

      {error && (
        <div className="wc-error-banner" data-testid="wc-error">
          {error}
          <button className="wc-error-close" onClick={() => setError(null)} type="button">
            x
          </button>
        </div>
      )}

      <div className="wc-body">
        {/* Left: Live Preview */}
        <section className="wc-left" aria-label="Live preview">
          <LivePreview config={config} />
          {htmlUrl && (
            <div className="wc-html-url">
              Preview URL: <a href={htmlUrl} target="_blank" rel="noopener">{htmlUrl}</a>
            </div>
          )}
        </section>

        {/* Right: Property Editors */}
        <section className="wc-right" aria-label="Customization properties">
          <div className="wc-properties-panel">
            <h2 className="wc-panel-title">Properties</h2>
            <div className="wc-properties-content">
              <div className="wc-text-input">
                <label htmlFor="wc-title">Title</label>
                <input
                  id="wc-title"
                  type="text"
                  value={config.title || ""}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. PRMS"
                  disabled={saving}
                />
              </div>

              <div className="wc-text-input wc-text-input--large">
                <label htmlFor="wc-desc">Description</label>
                <textarea
                  id="wc-desc"
                  value={config.description || ""}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="e.g. Property Rental Management System"
                  rows={3}
                  disabled={saving}
                />
              </div>

              <ColorInput
                value={config.background_color}
                onChange={handleBgColorChange}
                label="Background Color"
              />

              <LogoInput
                value={config.logo_url}
                onChange={handleLogoChange}
              />

              <div className="wc-text-input">
                <label htmlFor="wc-company">Company Name</label>
                <input
                  id="wc-company"
                  type="text"
                  value={config.company_name || ""}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  placeholder="e.g. Property Rental Management System"
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
