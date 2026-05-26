import { EditIcon, UserIcon } from '@vapor-ui/icons';
import type { Role } from '../../agent';

export type MessageAvatarProps = {
  role: Role;
};

/** 메시지 발신자 아바타. 어시스턴트는 채워진 원, 사용자는 중립 원. */
export function MessageAvatar({ role }: MessageAvatarProps) {
  const isAssistant = role === 'assistant';
  return (
    <div
      aria-hidden="true"
      className={[
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
        isAssistant ? 'bg-v-primary-200 text-v-white' : 'bg-v-canvas-200',
      ].join(' ')}
    >
      {isAssistant ? <EditIcon size={16} /> : <UserIcon size={16} />}
    </div>
  );
}
