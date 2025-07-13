import React from "react";

export default function Header({ mosque = {}, theme = {} }) {
  const fontEng = theme.fontEng || "font-sans";
  const fontAra = theme.fontAra || "font-sans";

  return (
    <header
      className={`
        ${theme.bgColor || "bg-white/10"}
        ${theme.textColor || "text-white"}
        ${theme.backdropBlur || "backdrop-blur-md"}
        ${theme.border || "border border-white/20"}
        ${theme.rounded || "rounded-b-xl"}
        ${theme.shadow || "shadow-lg"}
        ${theme.paddingY || "py-4"}
        ${theme.paddingX || "px-6"}
      `}
    >
      <div className="flex items-center justify-between flex-wrap">
        {/* Left: Logo and Name/Address */}
        <div className="flex items-center gap-4 flex-wrap">
          {mosque.logoUrl ? (
            <img
              src={mosque.logoUrl}
              alt="Mosque Logo"
              className={`${theme.logoWidth || "w-16"} h-auto`}
            />
          ) : null}
          <div className="flex flex-col">
            <h1 className={`${theme.nameSize || "text-2xl"} font-bold ${fontEng}`}>
              {mosque.name || "Mosque Name"}
            </h1>
            <p className={`${theme.addressSize || "text-sm"} opacity-80 ${fontEng}`}>
              {mosque.address || "Mosque Address"}
            </p>
          </div>
        </div>

        {/* Right: Web address */}
        <div className={`${theme.urlSize || "text-sm"} opacity-90 ${fontEng}`}>
          {mosque.webpage ? (
            <a
              href={`https://${mosque.webpage}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {mosque.webpage}
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}
