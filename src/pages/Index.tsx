
import { useIsMobile } from '@/hooks/use-mobile';
import ModelViewer from '@/components/ModelViewer';

const Index = () => {
  const { isPortrait, hasMouse, isTouchDevice } = useIsMobile();
  
  return (
    <div className="h-full w-full flex items-center justify-center overflow-hidden">
      <div className="h-full w-full">
        <ModelViewer forceHideHeader={false} />
      </div>
    </div>
  );
};

export default Index;
