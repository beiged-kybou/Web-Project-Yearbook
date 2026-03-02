SELECT
  pm.medicine_name,
  COUNT(pm.medication_id) AS prescription_count,
  COUNT(DISTINCT pm.prescription_id) AS unique_prescriptions,
  COUNT(DISTINCT pr.patient_id) AS unique_patients,
  STRING_AGG(DISTINCT pm.dosage, '; ') AS common_dosages
FROM prescription_medications pm
JOIN prescriptions pr ON pm.prescription_id = pr.prescription_id
GROUP BY pm.medicine_name
ORDER BY prescription_count DESC
LIMIT 30;
