import { Button } from "@/components/ui/button";

export default function Step1Filter({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
      <h1 className="text-3xl font-bold text-foreground leading-tight mb-8">
        Cette application n'est pas faite pour toutes les femmes.
      </h1>
      <ul className="space-y-3 text-muted-foreground text-base mb-12">
        <li>Pas une app de régime.</li>
        <li>Pas une solution rapide.</li>
        <li>
          Conçue pour les femmes dont le corps a changé… et qui veulent comprendre
          pourquoi.
        </li>
      </ul>
      <Button
        onClick={onNext}
        className="w-full h-14 rounded-xl text-base font-semibold leading-tight whitespace-normal"
      >
        Je veux comprendre ce qui se passe dans mon corps
      </Button>
    </div>
  );
}
