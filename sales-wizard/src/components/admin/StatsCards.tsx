interface Stats {
  total: number
  hot: number
  warm: number
  cold: number
  unscored: number
}

export default function StatsCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'Total Leads', value: stats.total, color: 'bg-gray-800', textColor: 'text-white' },
    { label: 'HOT Leads', value: stats.hot, color: 'bg-red-500', textColor: 'text-white', emoji: '🔥' },
    { label: 'WARM Leads', value: stats.warm, color: 'bg-orange-400', textColor: 'text-white', emoji: '☀️' },
    { label: 'COLD Leads', value: stats.cold, color: 'bg-blue-400', textColor: 'text-white', emoji: '❄️' },
  ]

  const hotPct = stats.total > 0 ? Math.round((stats.hot / stats.total) * 100) : 0
  const warmPct = stats.total > 0 ? Math.round((stats.warm / stats.total) * 100) : 0
  const coldPct = stats.total > 0 ? Math.round((stats.cold / stats.total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className={`${card.color} ${card.textColor} rounded-2xl p-5`}>
            <div className="text-3xl font-bold">{card.value}</div>
            <div className="text-sm opacity-80 mt-1">{card.emoji} {card.label}</div>
          </div>
        ))}
      </div>

      {stats.total > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Lead Score Distribution</h3>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-red-600 font-medium">HOT</span>
                <span className="text-gray-500">{hotPct}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${hotPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-orange-500 font-medium">WARM</span>
                <span className="text-gray-500">{warmPct}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${warmPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-blue-500 font-medium">COLD</span>
                <span className="text-gray-500">{coldPct}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${coldPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
