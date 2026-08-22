/**
 * Risk Engine — spesifikasiyanın 19-cu bəndi.
 *
 * QƏSDƏN AI-siz: risk səviyyəsi "AI-nin verdiyi təsadüfi rəqəm" olmamalıdır
 * (spesifikasiya, 18-ci bənd). Bunun əvəzinə tamamilə şəffaf, yoxlanıla bilən
 * qaydalar əsasında hesablanır — hər kəs bu qaydaları oxuyub nəyə görə
 * "CRITICAL" deyildiyini başa düşə bilər.
 *
 * Qaydalar:
 *  CRITICAL — məcburi tələb "missing" və ya "non_compliant"
 *  HIGH     — məcburi tələb "partially_compliant"
 *  MEDIUM   — məcburi tələb "needs_review", VƏ YA qeyri-məcburi "missing"/"non_compliant"
 *  LOW      — qeyri-məcburi "partially_compliant"/"needs_review"
 */
export function computeRisks(requirements) {
  const risks = [];

  for (const r of requirements) {
    if (r.mandatory && (r.status === 'missing' || r.status === 'non_compliant')) {
      risks.push({ level: 'critical', requirement: r });
    } else if (r.mandatory && r.status === 'partially_compliant') {
      risks.push({ level: 'high', requirement: r });
    } else if (
      (r.mandatory && r.status === 'needs_review') ||
      (!r.mandatory && (r.status === 'missing' || r.status === 'non_compliant'))
    ) {
      risks.push({ level: 'medium', requirement: r });
    } else if (!r.mandatory && (r.status === 'partially_compliant' || r.status === 'needs_review')) {
      risks.push({ level: 'low', requirement: r });
    }
  }

  return risks;
}

export function summarizeRisks(risks) {
  return {
    critical: risks.filter((r) => r.level === 'critical').length,
    high: risks.filter((r) => r.level === 'high').length,
    medium: risks.filter((r) => r.level === 'medium').length,
    low: risks.filter((r) => r.level === 'low').length,
  };
}

/**
 * "Tenderə qatılaqmı?" — DECISION SUPPORT, zəmanət deyil (spesifikasiya, 45-ci bənd).
 * Qayda: 1+ CRITICAL risk varsa → NO (məcburi şərt qarşılanmır); readiness score
 * aşağıdırsa (< 50%) və ya HIGH risk çoxdursa → REVIEW; əks halda → YES.
 */
export function computeBidRecommendation(risks, readinessScore, daysUntilDeadline) {
  const summary = summarizeRisks(risks);

  if (summary.critical > 0) {
    return {
      recommendation: 'NO',
      reasons: [`${summary.critical} məcburi tələb qarşılanmır (CRITICAL) — bu şərtlər olmadan tender uğursuz olacaq`],
    };
  }

  const reasons = [];
  let recommendation = 'YES';

  if (readinessScore !== null && readinessScore < 50) {
    recommendation = 'REVIEW';
    reasons.push(`Hazırlıq balı aşağıdır (${readinessScore}%)`);
  }
  if (summary.high >= 2) {
    recommendation = 'REVIEW';
    reasons.push(`${summary.high} yüksək risk mövcuddur`);
  }
  if (daysUntilDeadline !== null && daysUntilDeadline < 3) {
    recommendation = 'REVIEW';
    reasons.push(`Son tarixə ${daysUntilDeadline} gündən az qalıb`);
  }
  if (reasons.length === 0) {
    reasons.push('Kritik risk yoxdur, hazırlıq balı qənaətbəxşdir');
  }

  return { recommendation, reasons };
}
