/**
 * Risk Score Badge Component
 * Displays a color-coded risk score with visual indicator
 */

interface RiskScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskScoreBadge({ score, size = 'md' }: RiskScoreBadgeProps) {
  const getColor = () => {
    if (score > 70) return { bg: 'bg-red-100', text: 'text-red-800', ring: 'ring-red-500', bar: 'bg-red-500' };
    if (score > 40) return { bg: 'bg-yellow-100', text: 'text-yellow-800', ring: 'ring-yellow-500', bar: 'bg-yellow-500' };
    return { bg: 'bg-green-100', text: 'text-green-800', ring: 'ring-green-500', bar: 'bg-green-500' };
  };

  const getLabel = () => {
    if (score > 70) return 'High Risk';
    if (score > 40) return 'Medium Risk';
    return 'Low Risk';
  };

  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-2',
    lg: 'text-lg px-4 py-3',
  };

  const colors = getColor();

  return (
    <div className="flex flex-col items-center gap-2" role="status" aria-label={`Risk score: ${score} out of 100, ${getLabel()}`}>
      <div className={`${colors.bg} ${colors.text} ${sizeClasses[size]} rounded-full font-bold ring-2 ${colors.ring}`}>
        {score}/100
      </div>
      <span className={`${colors.text} text-sm font-medium`}>{getLabel()}</span>
      <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
        <div className={`${colors.bar} h-2 rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
