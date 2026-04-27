import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import Step1Filter from "@/components/onboarding/Step1Filter";
import Step2Mirror from "@/components/onboarding/Step2Mirror";
import Step3Diagnosis from "@/components/onboarding/Step3Diagnosis";
import Step4Truth from "@/components/onboarding/Step4Truth";
import Step5Data from "@/components/onboarding/Step5Data";
import Step6Result from "@/components/onboarding/Step6Result";
import {
  ONBOARDING_STORAGE_KEY,
  OnboardingAnswers,
  SymptomKey,
} from "@/lib/onboardingMessages";

const TOTAL = 6;

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [statements, setStatements] = useState<string[]>([]);
  const [duration, setDuration] = useState("");
  const [symptom, setSymptom] = useState<SymptomKey | "">("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activityLevel, setActivityLevel] = useState("sedentaire");

  const next = () => setStep((s) => Math.min(TOTAL - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finishToAuth = () => {
    const answers: OnboardingAnswers = {
      selected_statements: statements,
      duration_of_changes: duration,
      main_symptom: (symptom || "autre") as SymptomKey,
      age: Number(age),
      height: Number(height),
      weight: Number(weight),
      activity_level: activityLevel,
    };
    sessionStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(answers));
    navigate("/auth");
  };

  return (
    <OnboardingShell step={step} total={TOTAL} onBack={back}>
      {step === 0 && <Step1Filter onNext={next} />}
      {step === 1 && (
        <Step2Mirror selected={statements} setSelected={setStatements} onNext={next} />
      )}
      {step === 2 && (
        <Step3Diagnosis
          duration={duration}
          setDuration={setDuration}
          symptom={symptom}
          setSymptom={setSymptom}
          onNext={next}
        />
      )}
      {step === 3 && (
        <Step4Truth
          symptom={(symptom || "autre") as SymptomKey}
          statements={statements}
          onNext={next}
        />
      )}
      {step === 4 && (
        <Step5Data
          age={age}
          setAge={setAge}
          height={height}
          setHeight={setHeight}
          weight={weight}
          setWeight={setWeight}
          activityLevel={activityLevel}
          setActivityLevel={setActivityLevel}
          onNext={next}
        />
      )}
      {step === 5 && (
        <Step6Result
          age={Number(age)}
          height={Number(height)}
          weight={Number(weight)}
          activityLevel={activityLevel || "sedentaire"}
          symptom={(symptom || "autre") as SymptomKey}
          onNext={finishToAuth}
        />
      )}
    </OnboardingShell>
  );
}
