import { useState } from 'react';
import { Text } from '@vapor-ui/core';
import { ComplianceHeader } from '../components/compliance/ComplianceHeader';
import { ComplianceChecklist } from '../components/compliance/ComplianceChecklist';
import { ComplianceSummary } from '../components/compliance/ComplianceSummary';
import { ComplianceGateCard } from '../components/compliance/ComplianceGateCard';
import { MOCK_REPORT, type ComplianceReport } from '../components/compliance/mockReport';

/**
 * Vapor UI Compliance Workbench 최상위 페이지.
 *
 * Phase 1: 모크 데이터로 전체 UI 구조 검증.
 * Phase 3 이후: worker-engine 이 제공하는 실제 스캐너 결과로 교체 예정.
 */
export function CompliancePage() {
  const [report, setReport] = useState<ComplianceReport>(MOCK_REPORT);
  const [selectedGateId, setSelectedGateId] = useState<string>(
    MOCK_REPORT.gates[0]?.id ?? '',
  );
  const [isRunning, setIsRunning] = useState(false);

  const selectedGate =
    report.gates.find((g) => g.id === selectedGateId) ?? report.gates[0];

  /** Phase 1: 검사 실행은 mock — 짧은 딜레이 후 같은 리포트 재적용. */
  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setReport({ ...MOCK_REPORT, timestamp: new Date().toISOString() });
      setIsRunning(false);
    }, 1200);
  };

  const handleReset = () => {
    setReport(MOCK_REPORT);
    setSelectedGateId(MOCK_REPORT.gates[0]?.id ?? '');
  };

  return (
    <div className="flex min-h-screen flex-col bg-v-canvas-200">
      {/* 헤더 */}
      <ComplianceHeader
        onRun={handleRun}
        onReset={handleReset}
        isRunning={isRunning}
      />

      {/* 타임스탬프 */}
      <div className="px-v-400 py-v-150">
        <Text typography="body4" foreground="hint-200">
          마지막 검사:{' '}
          {new Date(report.timestamp).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </div>

      {/* 본문: 2-column @ md+ */}
      <div className="flex flex-1 flex-col gap-v-300 px-v-400 pb-v-400 md:flex-row md:items-start">
        {/* 좌측: 요약 + 체크리스트 */}
        <aside className="flex w-full flex-col gap-v-200 md:w-72 md:shrink-0">
          <ComplianceSummary report={report} />
          <ComplianceChecklist
            gates={report.gates}
            selectedGateId={selectedGateId}
            onSelectGate={setSelectedGateId}
          />
        </aside>

        {/* 우측: 선택된 Gate 상세 */}
        <main className="min-w-0 flex-1">
          {selectedGate ? (
            <ComplianceGateCard gate={selectedGate} />
          ) : (
            <div className="flex items-center justify-center py-v-400">
              <Text typography="body3" foreground="hint-200">
                게이트를 선택하세요.
              </Text>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
