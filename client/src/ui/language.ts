// A language dropdown that stays in sync with the current language (start page + Options).
import { getLanguage, LANGUAGES, onLanguageChange, setLanguage, type Lang } from "../i18n";

export function createLanguageSelect(): HTMLSelectElement {
  const select = document.createElement("select");
  select.className = "lang-select";
  for (const { code, name } of LANGUAGES) select.append(new Option(name, code));
  select.value = getLanguage();
  select.onchange = () => setLanguage(select.value as Lang);
  onLanguageChange(() => (select.value = getLanguage()));
  return select;
}
