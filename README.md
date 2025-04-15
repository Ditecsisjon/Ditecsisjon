import React from 'react';

interface ApplicationButtonProps {
  applicationDeadline: string;
}

const ApplicationButton = ({ applicationDeadline }: ApplicationButtonProps) => {
  return (
    <div className="bg-white p-6 md:p-12 border-t border-gray-200">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-gray-600">Sista ansökningsdag: {applicationDeadline}</p>
          </div>
          <button 
            className="bg-jobblue hover:bg-jobblue-dark text-white font-medium py-3 px-8 rounded-md transition-colors"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Ansök nu
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationButton;
