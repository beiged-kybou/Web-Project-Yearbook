SELECT 
  ds.doctor_id,
  u.full_name AS doctor_name,
  COUNT(*) AS total_slots,
  COUNT(CASE WHEN ap_slot.status = 'booked' THEN 1 END) AS booked_slots,
  COUNT(CASE WHEN ap_slot.status = 'free' THEN 1 END) AS free_slots,
  ROUND(100.0 * COUNT(CASE WHEN ap_slot.status = 'booked' THEN 1 END) / 
    NULLIF(COUNT(*), 0), 2) AS utilization_percentage
FROM doctor_schedules ds
JOIN users u ON ds.doctor_id = u.user_id
LEFT JOIN appointment_slots ap_slot ON ds.schedule_id = ap_slot.schedule_id
WHERE ap_slot.slot_date >= CURRENT_DATE
  AND ap_slot.slot_date <= CURRENT_DATE + INTERVAL '30 days'
GROUP BY ds.doctor_id, u.full_name
ORDER BY utilization_percentage DESC;
