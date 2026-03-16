import React from 'react';
import { Scale, ExternalLink } from 'lucide-react';

const TermsTab = () => {
    return (
        <div className="space-y-6 animate-slide-up-fade">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 shrink-0 border border-transparent dark:border-white/10">
                        <Scale size={24} className="shrink-0" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-[var(--text-primary)]">服務條款</h3>
                        <p className="text-[12px] font-bold text-slate-400">最後更新：2026 年 3 月 12 日</p>
                    </div>
                </div>
                <a href="/terms.html" target="_blank" rel="noreferrer" className="p-3 bg-white/50 dark:bg-white/5 rounded-xl hover:bg-white/80 dark:hover:bg-white/10 transition-colors text-blue-600 dark:text-blue-400 shadow-sm border border-white/60 dark:border-white/10" title="在新分頁開啟完整網頁">
                    <ExternalLink size={20} />
                </a>
            </div>

            <div className="bg-white/40 dark:bg-white/5 p-6 md:p-10 rounded-[32px] border border-white/50 dark:border-white/10 shadow-sm text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed font-bold">

                <p className="mb-4">歡迎使用 <strong className="text-blue-600 dark:text-blue-400">GSAT Pro</strong>（以下簡稱「本服務」）。本服務由 GSAT Pro 開發團隊提供。當您註冊帳號、登入或使用本服務時，即表示您已閱讀、理解並同意遵守本服務條款之所有內容。若您不同意本條款，請停止使用本服務。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-blue-500 mr-1">一、</span>服務說明</h2>
                <p className="mb-3">本服務為學習輔助工具，提供但不限於以下功能：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>課表管理與課程提醒</li>
                    <li>調課通知系統</li>
                    <li>學習筆記功能</li>
                    <li>單字學習與測驗功能</li>
                    <li>學習資料同步與雲端備份</li>
                    <li>AI 輔助學習工具</li>
                </ul>
                <p className="mb-4">本服務僅作為學習輔助用途，不構成任何教育機構、政府機關或考試機構之官方資訊來源。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-blue-500 mr-1">二、</span>帳號註冊與管理</h2>
                <p className="mb-3">使用本服務時，您可能需要透過第三方帳號登入，例如 Google 帳號。</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>您須確保提供之帳號資訊為正確且有效。</li>
                    <li>您應妥善保管您的登入憑證。</li>
                    <li>任何透過您的帳號進行的行為，均視為您本人操作。</li>
                    <li>若您發現帳號遭未授權使用，應立即通知開發團隊。</li>
                </ul>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-blue-500 mr-1">三、</span>使用者行為規範</h2>
                <p className="mb-3">使用本服務時，您同意不從事以下行為：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>違反任何法律或法規</li>
                    <li>干擾或破壞本服務系統安全</li>
                    <li>嘗試未經授權存取系統或資料</li>
                    <li>散播惡意程式、病毒或其他破壞性程式碼</li>
                    <li>利用本服務進行詐騙或其他非法活動</li>
                    <li>大量自動化請求或濫用系統資源</li>
                </ul>
                <p className="mb-4 text-rose-500 dark:text-rose-400">若違反上述規定，本服務有權暫停或終止您的帳號。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-blue-500 mr-1">四、</span>使用者內容</h2>
                <p className="mb-3">您在本服務中建立或上傳的內容可能包括：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>課表資料</li>
                    <li>學習筆記</li>
                    <li>學習紀錄</li>
                    <li>其他個人學習內容</li>
                </ul>
                <p className="mb-3">您保留對這些內容的所有權，但授權本服務在提供服務所需範圍內儲存、處理及顯示該內容。</p>
                <p className="mb-4 text-rose-500 dark:text-rose-400">您應確保所提供內容不侵犯他人權利。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-blue-500 mr-1">五、</span>AI 與學習內容聲明</h2>
                <p className="mb-3">本服務可能包含 AI 生成的學習內容，例如：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>單字解釋</li>
                    <li>學習建議</li>
                    <li>測驗題目</li>
                </ul>
                <p className="mb-3 text-orange-600 dark:text-orange-400">AI 生成內容可能存在錯誤或不完整之情形，使用者應自行判斷與查證其正確性。</p>
                <p className="mb-4">本服務不對 AI 內容的準確性、完整性或適用性提供任何保證。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-blue-500 mr-1">六、</span>智慧財產權</h2>
                <p className="mb-3">本服務之所有內容與技術，包括但不限於：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>軟體程式碼</li>
                    <li>介面設計</li>
                    <li>系統架構</li>
                    <li>圖示與視覺設計</li>
                    <li>資料結構</li>
                </ul>
                <p className="mb-3">均受智慧財產權法保護，並為開發團隊或授權方所有。</p>
                <p className="mb-3">未經書面許可，使用者不得：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px] text-rose-500 dark:text-rose-400">
                    <li>複製</li>
                    <li>修改</li>
                    <li>散布</li>
                    <li>反向工程</li>
                    <li>建立衍生作品</li>
                </ul>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-blue-500 mr-1">七、</span>服務可用性</h2>
                <p className="mb-3">本服務將盡力維持系統穩定，但不保證：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>服務永不中斷</li>
                    <li>服務完全無錯誤</li>
                    <li>資料不會遺失</li>
                </ul>
                <p className="mb-3">系統可能因以下原因暫停：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>系統維護</li>
                    <li>伺服器故障</li>
                    <li>網路問題</li>
                    <li>不可抗力因素</li>
                </ul>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-blue-500 mr-1">八、</span>責任限制</h2>
                <p className="mb-3">在法律允許範圍內，本服務對以下情況不承擔責任：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>資料遺失</li>
                    <li>通知延遲</li>
                    <li>系統中斷</li>
                    <li>學習成果未達預期</li>
                    <li>使用者依賴 AI 建議所造成之結果</li>
                </ul>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-blue-500 mr-1">九、</span>第三方服務</h2>
                <p className="mb-3">本服務可能整合第三方服務，例如：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>Google 帳號登入</li>
                    <li>雲端資料儲存</li>
                    <li>推播通知服務</li>
                </ul>
                <p className="mb-4">第三方服務可能有其自身條款與隱私政策，使用者亦應遵守該等規定。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-blue-500 mr-1">十、</span>服務修改與終止</h2>
                <p className="mb-3">本服務保留以下權利：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>隨時修改服務內容</li>
                    <li>新增或移除功能</li>
                    <li>暫停或終止服務</li>
                    <li>限制特定使用者存取</li>
                </ul>
                <p className="mb-4">上述變更可能不另行通知。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-blue-500 mr-1">十一、</span>帳號終止</h2>
                <p className="mb-3">在以下情況，本服務得終止或限制您的帳號：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px] text-rose-500 dark:text-rose-400">
                    <li>違反服務條款</li>
                    <li>濫用系統資源</li>
                    <li>涉及非法活動</li>
                </ul>
                <p className="mb-4">帳號終止後，部分資料可能會被刪除。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-blue-500 mr-1">十二、</span>隱私權</h2>
                <p className="mb-4">本服務對於使用者資料之蒐集與使用，將依據「隱私權政策」進行處理。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-blue-500 mr-1">十三、</span>條款修改</h2>
                <p className="mb-3">本服務保留隨時修改本服務條款之權利。修改後條款將公布於本服務平台，並於發布時生效。</p>
                <p className="mb-4">繼續使用本服務即表示您同意修改後條款。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-blue-500 mr-1">十四、</span>準據法與管轄</h2>
                <p className="mb-3">本條款之解釋與適用，應依中華民國（台灣）法律為準據法。</p>
                <p className="mb-4">若因本服務產生爭議，雙方同意以台灣法院為管轄法院。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-blue-500 mr-1">十五、</span>聯絡方式</h2>
                <p className="mb-3">若您對本服務條款有任何問題，請透過以下方式聯絡我們：</p>
                <ul className="list-none space-y-2 mb-4 text-[14px]">
                    <li><strong className="text-slate-800 dark:text-slate-200">Email：</strong> pyps0990@gmail.com</li>
                    <li><strong className="text-slate-800 dark:text-slate-200">開發者：</strong> GSAT Pro Team</li>
                </ul>
            </div>
        </div>
    );
};

export default TermsTab;