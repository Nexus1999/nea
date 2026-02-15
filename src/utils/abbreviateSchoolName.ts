/**
 * Abbreviates common educational institution terms in a school name.
 * @param name The full name of the school or center.
 * @returns The abbreviated string.
 */
const abbreviateSchoolName = (name: string): string => {
  if (!name) return "";

  return name
    .replace(/\bISLAMIC SEMINARY\b/gi, "ISL SEM")
    .replace(/\bSECONDARY SCHOOL\b/gi, "SS")
    .replace(/\bHIGH SCHOOL\b/gi, "SS")
    .replace(/\bPRIMARY SCHOOL\b/gi, "PS")
    .replace(/\bTEACHERS'? TRAINING COLLEGE\b/gi, "TC")
    .replace(/\bTEACHERS'? COLLEGE\b/gi, "TC")
    .replace(/\bSEMINARY\b/gi, "SEM")
    .replace(/\s+/g, " ") // Collapse multiple spaces into one
    .trim();
};

export default abbreviateSchoolName;