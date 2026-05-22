# Component API

Prompt Input Component Layer 의 공개 컴포넌트와 props 명세.
모든 props 는 Vapor primitive 가 아니라 제품 요구사항을 기준으로 정의한다.

## PromptBar

PromptBox / Dropzone / AttachmentList / DataSourceSelector 를 조립한
최상위 합성 컴포넌트. 입력·첨부·데이터소스 상태를 내부에서 관리한다.

| Prop | Type | Default | 설명 |
| --- | --- | --- | --- |
| `dataSourceOptions` | `DataSourceOption[]` | — | 선택 가능한 데이터소스 목록 |
| `multipleDataSources` | `boolean` | `false` | 데이터소스 다중 선택 허용 |
| `maxLength` | `number` | `1000` | 프롬프트 최대 글자수 |
| `accept` | `string[]` | — | 허용 파일 형식 (확장자 / MIME) |
| `maxFileSize` | `number` | — | 첨부 파일 최대 크기(byte) |
| `multipleFiles` | `boolean` | `true` | 파일 다중 첨부 허용 |
| `disabled` | `boolean` | `false` | 전체 비활성화 |
| `placeholder` | `string` | `'무엇이든 물어보세요.'` | 입력창 placeholder |
| `onSubmit` | `(payload: PromptSubmitPayload) => void` | — | 제출 콜백 |

`PromptSubmitPayload = { text: string; attachments: PromptAttachment[]; dataSources: string[] }`

## PromptBox

프롬프트 입력 · 제출 · 글자수를 담당한다.

| Prop | Type | Default | 설명 |
| --- | --- | --- | --- |
| `value` | `string` | — | 입력값 (controlled) |
| `onValueChange` | `(value: string) => void` | — | 입력값 변경 콜백 |
| `onSubmit` | `() => void` | — | 제출 콜백 |
| `maxLength` | `number` | — | 최대 글자수. 지정 시 글자수 표시 |
| `disabled` | `boolean` | `false` | 비활성화 |
| `placeholder` | `string` | — | placeholder |
| `submitLabel` | `string` | `'보내기'` | 제출 버튼 라벨 |

동작: Enter 제출 / Shift+Enter 줄바꿈 / IME 조합 중 Enter 무시 /
빈 값·maxLength 초과 시 제출 비활성화.

## Dropzone

파일 드래그&드롭 / 클릭 업로드를 담당한다.

| Prop | Type | Default | 설명 |
| --- | --- | --- | --- |
| `accept` | `string[]` | — | 허용 형식. 확장자(`.png`), 와일드카드(`image/*`), MIME |
| `maxSize` | `number` | — | 최대 크기(byte) |
| `multiple` | `boolean` | `false` | 다중 선택 허용 |
| `disabled` | `boolean` | `false` | 비활성화 |
| `onFiles` | `(files: File[]) => void` | — | 통과한 파일 콜백 |
| `onReject` | `(rejection: FileRejection) => void` | — | 거부된 파일 콜백 |

`FileRejection = { fileName: string; reason: FileRejectReason }`
`FileRejectReason = 'unaccepted-type' | 'exceeds-max-size' | 'too-many-files'`

## AttachmentList

첨부 파일 목록을 표시한다. 첨부가 없으면 렌더링하지 않는다.

| Prop | Type | 설명 |
| --- | --- | --- |
| `attachments` | `PromptAttachment[]` | 첨부 파일 목록 |
| `onRemove` | `(id: string) => void` | 파일 제거 콜백 |

`PromptAttachment = { id: string; fileName: string; size: number; status: AttachmentStatus; errorMessage?: string }`
`AttachmentStatus = 'idle' | 'uploading' | 'done' | 'error'`

## DataSourceSelector

AI 답변 생성에 사용할 데이터소스를 선택한다.

| Prop | Type | Default | 설명 |
| --- | --- | --- | --- |
| `options` | `DataSourceOption[]` | — | 선택 가능한 데이터소스 |
| `selected` | `string[]` | — | 선택된 데이터소스 id 목록 |
| `onChange` | `(selected: string[]) => void` | — | 선택 변경 콜백 |
| `multiple` | `boolean` | `false` | 다중 선택 허용 |
| `disabled` | `boolean` | `false` | 비활성화 |

`DataSourceOption = { id: string; label: string; description?: string }`

`multiple` 여부와 무관하게 공개 API 는 항상 문자열 배열(`selected`)로 통일한다.
