import React, { useState } from 'react';

export default function HourlySchedulePicker({ scheduleTimes, onChange, maxRunsPerDay, estimatedRunDurationMinutes = 30 }) {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const MIN_INTERVAL_MINUTES = 5; // Mínimo de 5 minutos entre execuções

  const addTime = () => {
    const timeStr = `${selectedHour}:${selectedMinute}`;
    if (!scheduleTimes.includes(timeStr)) {
      const updated = [...scheduleTimes, timeStr].sort();
      onChange(updated);
      setShowTimePicker(false);
    }
  };

  const removeTime = (timeStr) => {
    onChange(scheduleTimes.filter(t => t !== timeStr));
  };

  // Verifica conflito: mínimo de 20 minutos entre runs
  const hasTimeConflict = () => {
    if (scheduleTimes.length <= 1) return false;

    const sorted = [...scheduleTimes].sort();
    for (let i = 0; i < sorted.length - 1; i++) {
      const [hour1, min1] = sorted[i].split(':').map(Number);
      const [hour2, min2] = sorted[i + 1].split(':').map(Number);
      const minutesBetween = (hour2 - hour1) * 60 + (min2 - min1);

      if (minutesBetween < MIN_INTERVAL_MINUTES) {
        return true;
      }
    }
    return false;
  };

  const canAddMore = scheduleTimes.length < maxRunsPerDay;
  const conflict = hasTimeConflict();

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Horários Agendados: <span className="text-accent-purple font-semibold">{scheduleTimes.length}</span>
        </label>

        {scheduleTimes.length > 0 && (
          <div className="mb-3 p-3 bg-surface rounded-lg border border-surface-border">
            <div className="flex flex-wrap gap-2">
              {scheduleTimes.map((time) => (
                <div
                  key={time}
                  className="flex items-center gap-2 px-3 py-1 bg-accent-purple/20 border border-accent-purple/40 rounded-full text-sm text-accent-purple"
                >
                  <span>🕐 {time}</span>
                  <button
                    onClick={() => removeTime(time)}
                    className="ml-1 hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {conflict && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
            ⚠ Aviso: Horários muito próximos (mínimo 5 minutos entre execuções)
          </div>
        )}

        {canAddMore ? (
          <>
            {!showTimePicker ? (
              <button
                onClick={() => setShowTimePicker(true)}
                className="w-full px-4 py-2 rounded-lg border border-accent-purple/50 text-accent-purple hover:bg-accent-purple/10 transition-all text-sm font-medium"
              >
                + Adicionar Horário
              </button>
            ) : (
              <div className="space-y-3 p-3 bg-charcoal rounded-lg border border-accent-purple/30">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Selecione hora e minutos</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedHour}
                      onChange={(e) => setSelectedHour(e.target.value)}
                      className="flex-1 rounded-lg border border-surface-border bg-charcoal px-3 py-2 text-white text-sm"
                    >
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = String(i).padStart(2, '0');
                        return (
                          <option key={hour} value={hour}>
                            {hour}:00
                          </option>
                        );
                      })}
                    </select>
                    <select
                      value={selectedMinute}
                      onChange={(e) => setSelectedMinute(e.target.value)}
                      className="w-20 rounded-lg border border-surface-border bg-charcoal px-3 py-2 text-white text-sm"
                    >
                      {Array.from({ length: 12 }, (_, i) => {
                        const minute = String(i * 5).padStart(2, '0');
                        return (
                          <option key={minute} value={minute}>
                            :{minute}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      onClick={addTime}
                      className="px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-all text-sm font-medium"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => setShowTimePicker(false)}
                      className="px-4 py-2 bg-surface-border text-gray-300 rounded-lg hover:bg-surface-border/80 transition-all text-sm font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded text-xs text-orange-400">
            Limite de {maxRunsPerDay} horários/dia atingido
          </div>
        )}
      </div>

      {scheduleTimes.length > 0 && !conflict && (
        <div className="p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400">
          ✓ Horários válidos — sem risco de sobreposição
        </div>
      )}
    </div>
  );
}
