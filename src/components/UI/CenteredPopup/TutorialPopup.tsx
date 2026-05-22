import { useState } from "react";
import styles from "./CenteredPopup.module.css";

const TUTORIAL_STEPS = [
  {
    title: "Добро пожаловать в TSUFarm!",
    content: "Это симулятор фермы и градостроения. Ваша задача — развить поселение, наладить логистику и достичь процветания.",
    icon: "👋"
  },
  {
    title: "Как строить здания",
    content: "Откройте вкладку 🏢 в левой панели, выберите здание и кликните на карту. Некоторые здания можно 'растягивать' (например, дороги или грядки).",
    icon: "🏗️"
  },
  {
    title: "Посадка культур",
    content: "Постройте грядку, кликните по ней правой кнопкой мыши (или левой, когда нет активного инструмента), выберите культуру и нажмите 'Посадить'.",
    icon: "🌱"
  },
  {
    title: "Логистика и Экспорт",
    content: "Чтобы ресурсы перемещались между зданиями, кликните на здание-отправитель (например, Мельницу), нажмите кнопку 'Экспорт' и выберите здание-получатель (например, Пекарню).",
    icon: "🚚"
  },
  {
    title: "Важные панели",
    content: "💰 'Рынок': котировки и спрос.\n👥 'Жители': список людей и смена профессий.\n📊 'Статистика': ваши доходы и расходы за день.\n☁️ Справа сверху: погода, деньги и уровень города.",
    icon: "📐"
  }
];

export default function TutorialPopup({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);

  const currentStep = TUTORIAL_STEPS[step];

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} style={{ maxWidth: "450px" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <span style={{ fontSize: "48px" }}>{currentStep.icon}</span>
          <h2 style={{ marginTop: "10px" }}>{currentStep.title}</h2>
        </div>
        
        <p style={{ 
          whiteSpace: "pre-line", 
          lineHeight: "1.5", 
          fontSize: "14px",
          minHeight: "80px"
        }}>
          {currentStep.content}
        </p>

        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          marginTop: "30px",
          alignItems: "center"
        }}>
          <p style={{ fontSize: "12px", opacity: 0.6 }}>
            Шаг {step + 1} из {TUTORIAL_STEPS.length}
          </p>
          
          <div style={{ display: "flex", gap: "10px" }}>
            {step > 0 && (
              <button 
                onClick={() => setStep(s => s - 1)}
                className={styles.secondaryBtn}
              >
                Назад
              </button>
            )}
            
            {step < TUTORIAL_STEPS.length - 1 ? (
              <button 
                onClick={() => setStep(s => s + 1)}
                className={styles.primaryBtn}
              >
                Далее
              </button>
            ) : (
              <button 
                onClick={onClose}
                className={styles.primaryBtn}
              >
                Понятно!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
