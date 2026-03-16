import React from 'react';
import { Eye, ExternalLink } from 'lucide-react';

const PrivacyTab = () => {
    return (
        <div className="space-y-6 animate-slide-up-fade">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0 border border-transparent dark:border-white/10">
                        <Eye size={24} className="shrink-0" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-[var(--text-primary)]">隱私權政策</h3>
                        <p className="text-[12px] font-bold text-slate-400">最後更新：2026 年 3 月 12 日</p>
                    </div>
                </div>
                <a href="/privacy.html" target="_blank" rel="noreferrer" className="p-3 bg-white/50 dark:bg-white/5 rounded-xl hover:bg-white/80 dark:hover:bg-white/10 transition-colors text-emerald-600 dark:text-emerald-400 shadow-sm border border-white/60 dark:border-white/10" title="在新分頁開啟完整網頁">
                    <ExternalLink size={20} />
                </a>
            </div>

            <div className="bg-white/40 dark:bg-white/5 p-6 md:p-10 rounded-[32px] border border-white/50 dark:border-white/10 shadow-sm text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed font-bold">

                <p className="mb-4">歡迎您使用 <strong className="text-emerald-600 dark:text-emerald-400">GSAT Pro</strong>（以下簡稱「本 App」）。為了讓您能安心使用本 App 的各項服務與資訊，特此向您說明本 App 的隱私權保護政策，以保障您的權益。請您詳細閱讀以下內容。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-emerald-500 mr-1">一、</span>隱私權政策的適用範圍</h2>
                <p className="mb-3">本隱私權政策說明本 App 在您使用服務時，如何蒐集、使用、處理與保護您的個人資料。</p>
                <p className="mb-4">本政策適用於本 App 所提供的所有服務，但不適用於本 App 以外的第三方網站、服務或應用程式。當您透過本 App 連結至其他網站或服務時，應參考該網站或服務的隱私權政策。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-emerald-500 mr-1">二、</span>我們蒐集的資料類型</h2>

                <h3 className="text-[16px] font-black text-slate-800 dark:text-slate-200 mt-6 mb-3">1. 帳號資訊</h3>
                <p className="mb-3">當您使用 Google 帳號登入本 App 時，我們可能會蒐集以下資訊：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>姓名（Display Name）</li>
                    <li>電子郵件地址（Email Address）</li>
                    <li>個人頭像（Profile Picture）</li>
                    <li>Google 帳號識別碼（UID）</li>
                </ul>
                <p className="mb-3">這些資訊僅用於：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>建立您的使用者帳號</li>
                    <li>提供跨裝置資料同步</li>
                    <li>識別使用者身分</li>
                </ul>

                <h3 className="text-[16px] font-black text-slate-800 dark:text-slate-200 mt-6 mb-3">2. 使用者內容資料</h3>
                <p className="mb-3">當您使用本 App 的學習與課表功能時，我們可能會儲存以下資料：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>課表設定</li>
                    <li>班級代號（Class ID）</li>
                    <li>筆記內容</li>
                    <li>學習進度</li>
                    <li>使用者設定</li>
                </ul>

                <h3 className="text-[16px] font-black text-slate-800 dark:text-slate-200 mt-6 mb-3">3. 裝置資訊</h3>
                <p className="mb-3">為提供通知與系統服務，本 App 可能會收集：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>裝置型號</li>
                    <li>作業系統版本</li>
                    <li>推播通知識別碼（FCM Token）</li>
                    <li>應用程式版本</li>
                </ul>

                <h3 className="text-[16px] font-black text-slate-800 dark:text-slate-200 mt-6 mb-3">4. 使用行為資料</h3>
                <p className="mb-3">為了改善服務品質，我們可能收集：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>使用功能紀錄</li>
                    <li>錯誤回報與崩潰紀錄</li>
                    <li>使用統計資料</li>
                </ul>
                <p className="mb-4">這些資料僅用於服務優化與問題修復。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-emerald-500 mr-1">三、</span>資料的使用目的</h2>
                <p className="mb-3">本 App 蒐集資料的目的包括：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>提供與維護 App 功能</li>
                    <li>建立與管理使用者帳號</li>
                    <li>提供課表提醒與通知服務</li>
                    <li>同步使用者資料</li>
                    <li>改善使用者體驗</li>
                    <li>進行系統維護與安全監控</li>
                </ul>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-emerald-500 mr-1">四、</span>資料儲存與安全</h2>
                <p className="mb-3">本 App 使用安全的雲端服務進行資料儲存，包括：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>Firebase Authentication</li>
                    <li>Firebase Firestore / Realtime Database</li>
                    <li>Firebase Cloud Messaging</li>
                </ul>
                <p className="mb-3">我們採取合理的技術與管理措施，以保護您的資料免於：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>未經授權存取</li>
                    <li>資料洩漏</li>
                    <li>資料竄改</li>
                    <li>資料毀損</li>
                </ul>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-emerald-500 mr-1">五、</span>第三方服務</h2>
                <p className="mb-3">本 App 可能使用以下第三方服務提供部分功能：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>Google Sign-In（Google 帳號登入）</li>
                    <li>Firebase（資料庫與推播服務）</li>
                </ul>
                <p className="mb-4">這些服務可能會依其自身隱私政策處理部分資料，建議您同時參考其官方隱私政策。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-emerald-500 mr-1">六、</span>與第三方分享資料</h2>
                <p className="mb-3">本 App 不會出售、交換或出租您的個人資料。除以下情況外，我們不會與任何第三方分享您的資料：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>經您同意</li>
                    <li>為提供 App 功能所必要的服務（如雲端服務）</li>
                    <li>符合法律或政府機關要求</li>
                    <li>為保護使用者或系統安全</li>
                </ul>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-emerald-500 mr-1">七、</span>資料保存期限</h2>
                <p className="mb-3">我們僅在提供服務所需的期間內保存您的資料。</p>
                <p className="mb-4">當您刪除帳號或停止使用服務時，相關資料可能會被刪除或匿名化處理，除非法律另有規定。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-emerald-500 mr-1">八、</span>使用者權利</h2>
                <p className="mb-3">您擁有以下權利：</p>
                <ul className="list-disc pl-6 space-y-2 mb-4 text-[14px]">
                    <li>查詢您的個人資料</li>
                    <li>要求更正資料</li>
                    <li>要求刪除帳號與資料</li>
                    <li>撤回資料使用同意</li>
                </ul>
                <p className="mb-4">如需行使上述權利，請透過下方聯絡方式與我們聯繫。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-emerald-500 mr-1">九、</span>兒童隱私</h2>
                <p className="mb-4">本 App 並非專為 13 歲以下兒童設計。若我們發現無意中收集了兒童個人資料，將會立即刪除。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-emerald-500 mr-1">十、</span>隱私權政策之修訂</h2>
                <p className="mb-3">本 App 保留隨時修改本隱私權政策的權利。若政策有重大變更，我們將透過 App 或網站公告。</p>
                <p className="mb-4">更新後的政策將於發布時立即生效。</p>

                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-8 mb-4 border-b border-slate-200 dark:border-white/10 pb-2"><span className="text-emerald-500 mr-1">十一、</span>聯絡我們</h2>
                <p className="mb-3">若您對本隱私權政策有任何問題，請透過以下方式聯絡我們：</p>
                <ul className="list-none space-y-2 mb-4 text-[14px]">
                    <li><strong className="text-slate-800 dark:text-slate-200">Email：</strong> pyps0990@gmail.com</li>
                    <li><strong className="text-slate-800 dark:text-slate-200">開發者：</strong> GSAT Pro Team</li>
                </ul>
            </div>
        </div>
    );
};

export default PrivacyTab;