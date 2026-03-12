import { FiInbox } from 'react-icons/fi';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
}

export default function EmptyState({ title, message, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-gray-300 mb-4">
        {icon || <FiInbox className="h-16 w-16" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-600 mb-2">{title}</h3>
      <p className="text-gray-400 max-w-md">{message}</p>
    </div>
  );
}
