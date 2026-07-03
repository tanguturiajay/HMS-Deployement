const sanitizeQualifications = (qualifications = []) => {
  // Trim spaces
  const trimmedQualifications = qualifications.map((qualification) =>
    qualification.trim(),
  );

  // Remove empty strings
  const nonEmptyQualifications = trimmedQualifications.filter(
    (qualification) => qualification.length > 0,
  );

  // Remove duplicates
  const uniqueQualifications = [...new Set(nonEmptyQualifications)];

  return uniqueQualifications;
};

module.exports = sanitizeQualifications;