'use client';

interface DatePickerProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export default function DatePicker({ selectedDate, onDateChange }: DatePickerProps) {
  // Generate dates for the next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    return date;
  });

  const formatDateValue = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Select a Date
      </label>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {dates.map((date) => {
          const dateValue = formatDateValue(date);
          const isSelected = selectedDate === dateValue;

          return (
            <button
              key={dateValue}
              onClick={() => onDateChange(dateValue)}
              className={`flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <span className="text-xs font-medium uppercase">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className="text-lg font-bold">{date.getDate()}</span>
              <span className="text-xs">
                {date.toLocaleDateString('en-US', { month: 'short' })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
