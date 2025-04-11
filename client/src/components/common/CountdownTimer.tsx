import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  endTime: Date | string;
  onComplete?: () => void;
  className?: string;
}

const CountdownTimer = ({ endTime, onComplete, className = '' }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isComplete, setIsComplete] = useState<boolean>(false);
  
  useEffect(() => {
    // Convert string to Date if necessary
    const targetDate = typeof endTime === 'string' ? new Date(endTime) : endTime;
    
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setTimeLeft('Complete');
        setIsComplete(true);
        if (onComplete) onComplete();
        return;
      }
      
      // Calculate hours, minutes, seconds
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      // Format the time left
      let formattedTime = '';
      
      if (hours > 0) {
        formattedTime += `${hours}:`;
      }
      
      formattedTime += `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      setTimeLeft(formattedTime);
    };
    
    // Calculate on mount and then every second
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    
    // Clean up the interval on unmount
    return () => clearInterval(timer);
  }, [endTime, onComplete]);
  
  return (
    <span className={`${className} ${isComplete ? 'text-[#00B9AE]' : 'text-[#C8B8DB]/70'}`}>
      {timeLeft}
    </span>
  );
};

export default CountdownTimer;
