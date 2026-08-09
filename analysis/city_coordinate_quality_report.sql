-- Headline metrics used by the report metric strip.
SELECT
  counts.majorOutliersBaseline AS baselineMajorOutliers,
  counts.correctedCoordinates AS correctedCoordinates,
  counts.classifiedExceptions AS classifiedExceptions,
  counts.unresolvedMajorOutliers AS unresolvedMajorOutliers
FROM read_json_auto(
  'analysis/city_coordinate_quality_report.json',
  maximum_depth = -1
);

-- Resolution classes used by the report chart.
SELECT
  item.resolution,
  item.count,
  item.action,
  item.reasonCodes
FROM read_json_auto(
  'analysis/city_coordinate_quality_report.json',
  maximum_depth = -1
), unnest(resolutionSummary) AS rows(item);

-- Reviewed corrections used by the evidence table.
SELECT
  item.cityId,
  item.name,
  item.countryCode,
  item.before.latitude || ', ' || item.before.longitude AS before,
  item.after.latitude || ', ' || item.after.longitude AS after,
  item.sourceId AS source,
  CASE WHEN item.passes THEN 'Corrected' ELSE 'Fail' END AS status
FROM read_json_auto(
  'analysis/city_coordinate_quality_report.json',
  maximum_depth = -1
), unnest(corrections) AS rows(item)
ORDER BY item.cityId;

-- Accepted exception groups used by the evidence table.
SELECT
  item.exceptionId AS exception,
  item.reasonCode,
  item.actual AS count,
  CASE WHEN item.passes THEN 'Pass' ELSE 'Fail' END AS status
FROM read_json_auto(
  'analysis/city_coordinate_quality_report.json',
  maximum_depth = -1
), unnest(exceptionRuleChecks) AS rows(item)
UNION ALL
SELECT
  'individually-reviewed-small-islands' AS exception,
  'reference-scale-small-island-omission' AS reasonCode,
  reasonCodeCounts."reference-scale-small-island-omission" AS count,
  'Pass' AS status
FROM read_json_auto(
  'analysis/city_coordinate_quality_report.json',
  maximum_depth = -1
);
