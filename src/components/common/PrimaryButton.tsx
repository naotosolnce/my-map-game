import React from 'react';

// Propsの型定義
interface PrimaryButtonProps {
  children: React.ReactNode; // ボタンの中に表示する内容 (テキスト、アイコンなど)
  onClick: () => void; // ボタンがクリックされたときの関数
  className?: string; // 追加のTailwind CSSクラスを渡せるようにする (オプション)
  Icon?: React.ElementType; // Lucide Reactなどのアイコンコンポーネントを渡せるようにする (オプション)
  type?: 'button' | 'submit' | 'reset'; // ボタンのHTMLタイプ (デフォルトは'button')
  disabled?: boolean; // ボタンを無効にするかどうか
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  onClick,
  className = '',
  Icon,
  type = 'button',
  disabled = false,
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`
        w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-4 px-6 rounded-2xl
        font-semibold shadow-lg hover:shadow-xl transform transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        flex items-center justify-center space-x-3 ${className}
      `}
      disabled={disabled}
    >
      {Icon && <Icon className="w-5 h-5" />}
      <span>{children}</span>
    </button>
  );
};

export default PrimaryButton;