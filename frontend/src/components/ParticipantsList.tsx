import { Users, Crown, User } from 'lucide-react';

type Participant = {
  id: string | number;
  name: string;
  role: string;
};

type ParticipantsListProps = {
  participants: Participant[];
};

const ParticipantsList: React.FC<ParticipantsListProps> = ({ participants }) => {
  return (
    <div className="p-3 border-b border-gray-200">
      <h4 className="font-medium text-gray-800 flex items-center mb-3">
        <Users className="w-4 h-4 mr-2" />
        Participants ({participants.length})
      </h4>
      
      <div className="space-y-2">
        {participants.map((participant) => (
          <div key={participant.id} className="flex items-center space-x-2">
            {participant.role === 'teacher' ? (
              <Crown className="w-4 h-4 text-yellow-500" />
            ) : (
              <User className="w-4 h-4 text-gray-500" />
            )}
            <span className="text-sm text-gray-700">{participant.name}</span>
            <span 
              className={`text-xs px-2 py-1 rounded ${
                participant.role === 'teacher' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {participant.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParticipantsList;