
import { Progress } from '@/components/ui/progress';

interface LoadingOverlayProps {
  progress: number;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ progress }) => {
  // Detailed progress status function
  const getProgressStatus = (progress: number) => {
    if (progress < 10) return "Ladevorgang wird initialisiert...";
    if (progress < 25) return "Verbindung wird hergestellt...";
    if (progress < 40) return "Datei wird hochgeladen...";
    if (progress < 60) return "Modell wird verarbeitet...";
    if (progress < 85) return "Texturen werden geladen...";
    if (progress < 95) return "Vorschau wird vorbereitet...";
    return "Ladevorgang abgeschlossen";
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md z-50 animate-fade-in">
      <div className="glass w-80 p-6 rounded-lg space-y-4 bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
        <h3 className="text-xl font-medium text-center text-foreground">
          Modell wird geladen...
        </h3>
        <Progress value={progress} className="h-2 bg-secondary" />
        <p className="text-sm text-muted-foreground text-center">
          {getProgressStatus(progress)}
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
