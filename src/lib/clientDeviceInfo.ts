export type ClientDeviceInfo = {
  language: string;
  timeZone: string;
};

export function getClientDeviceInfo(): ClientDeviceInfo {
  if (typeof window === "undefined") {
    return {
      language: "",
      timeZone: "",
    };
  }

  const language =
    (Array.isArray(navigator.languages) && navigator.languages[0]) ||
    navigator.language ||
    "";
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";

  return {
    language,
    timeZone,
  };
}
