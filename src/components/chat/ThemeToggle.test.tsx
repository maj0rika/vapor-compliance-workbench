import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@vapor-ui/core';
import { ThemeToggle } from './ThemeToggle';

/**
 * U07: 다크모드 토글이 시각 효과를 만들도록 Vapor `ThemeProvider` 와 연결되어
 *      `data-theme` (또는 동등한 root-level theme attribute) 가 실제로 토글되는지
 *      확인한다. Vapor 토큰 CSS 변수가 이 attribute 에 묶여 light/dark 값으로
 *      자동 전환되므로, attribute 가 바뀐다는 사실이 app shell 의 다크모드
 *      적용 가시화 보장이다 (별도 `dark:` Tailwind 클래스 불필요).
 */
/**
 * Vapor `ThemeProvider` 는 `documentElement` (`<html>`) 에
 * `data-vapor-theme="light"|"dark"` 를 박아 토큰 CSS 변수가 light/dark 값으로
 * 자동 전환되게 한다. 또한 `color-scheme: light|dark` style 도 함께 박혀
 * 브라우저 native control (scrollbar 등) 도 모드에 맞게 렌더된다.
 *
 * 본 테스트는 그 attribute 가 실제로 토글되는지를 본다 — 별도 `dark:`
 * Tailwind 클래스 없이도 `bg-v-*`/`text-v-*` 등 Vapor 유틸리티가 다크모드에
 * 적응한다는 것이 보장된다.
 */
function readVaporTheme(): string | null {
  return document.documentElement.getAttribute('data-vapor-theme');
}

describe('ThemeToggle (U07)', () => {
  it('Vapor ThemeProvider 하위에서 클릭 시 documentElement data-vapor-theme 이 토글된다', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>,
    );

    expect(readVaporTheme()).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: '다크 모드로 전환' }));

    expect(readVaporTheme()).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: '라이트 모드로 전환' }));

    expect(readVaporTheme()).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('aria-label 이 현재 모드에 따라 의도 그대로 갱신된다', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(screen.getByRole('button', { name: '다크 모드로 전환' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다크 모드로 전환' }));
    expect(screen.getByRole('button', { name: '라이트 모드로 전환' })).toBeInTheDocument();
  });
});
