import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, LockKeyhole, XCircle, Send, Settings } from "lucide-react";
import { initializeApp } from "firebase/app";
import { collection, deleteDoc, doc, getDocs, getFirestore, onSnapshot, setDoc } from "firebase/firestore";
import "./style.css";

const INITIAL_TEAMS = {
  이스라엘팀: ["김애희", "박주학", "이경진", "이정옥", "이상민", "이진경", "최미숙"],
  사역기도문팀: ["홍현옥", "하경은", "김명숙", "김윤하", "김은혜", "김정아", "박가영", "신윤혁", "이다현", "한지연", "배성연"],
  진행팀: ["김지영", "조수아", "고은빈", "김선정", "배재옥", "유향미", "이은정", "이하늘", "홍민우"],
  비전센터팀: ["김지연", "오미해", "김미영", "김애숙", "김현진", "김혜림", "허은경", "윤에스라"],
  다음세대팀: ["황금례", "김영희", "박유리", "윤지혜"],
};

const DEFAULT_MEETING_OPTIONS = ["연합기도회", "NCMN 중보기도팀 모임"];
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - 1 + index);
const ADMIN_ID = "김영신";
const ADMIN_PASSWORD = "1234";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
const firebaseApp = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;

function Button({ children, className = "", variant = "default", ...props }) {
  return <button className={`btn ${variant === "outline" ? "btn-outline" : "btn-default"} ${className}`} {...props}>{children}</button>;
}

function Card({ children, className = "" }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function safeId(value) {
  return encodeURIComponent(String(value).trim()).replace(/\./g, "%2E");
}

function getMainMeetingTitle(type) {
  return type === "NCMN 중보기도팀 모임" ? "중보기도팀 모임" : type;
}

function buildMeetingLabel(type, month) {
  return `${month}월 ${getMainMeetingTitle(type)}`;
}

function buildMeetingKey(type, year, month) {
  return `${year}-${String(month).padStart(2, "0")}-${type}`;
}

function getResponseYear(item) {
  return item.year || new Date(item.createdAt || Date.now()).getFullYear();
}

function makeResponseId(response) {
  return [response.meetingKey, safeId(response.team), safeId(response.name)].join("_");
}

function createEmptyForm() {
  return { team: "", name: "", attendance: "참석", absentReason: "" };
}

function buildSummary(list) {
  return list.reduce((acc, item) => {
    acc.total += 1;
    acc[item.attendance] += 1;
    acc.teams[item.team] = acc.teams[item.team] || { total: 0, 참석: 0, 불참: 0 };
    acc.teams[item.team].total += 1;
    acc.teams[item.team][item.attendance] += 1;
    return acc;
  }, { total: 0, 참석: 0, 불참: 0, teams: {} });
}

async function seedDefaultDataIfEmpty() {
  if (!db) return;

  const snap = await getDocs(collection(db, "teams"));
  if (snap.empty) {
    await Promise.all(Object.entries(INITIAL_TEAMS).map(([name, members]) =>
      setDoc(doc(db, "teams", safeId(name)), { name, members, updatedAt: new Date().toISOString() })
    ));
  }
}

function runSelfTests() {
  const s = buildSummary([{ team: "A팀", attendance: "참석" }, { team: "A팀", attendance: "불참" }]);
  console.assert(s.total === 2, "전체 응답 수 계산 오류");
  console.assert(s.참석 === 1, "참석 수 계산 오류");
  console.assert(buildMeetingLabel("연합기도회", 5) === "5월 연합기도회", "월별 모임명 오류");
  console.assert(buildMeetingKey("연합기도회", 2026, 5) !== buildMeetingKey("연합기도회", 2026, 6), "월별 키 분리 오류");
  console.assert(buildMeetingLabel("NCMN 중보기도팀 모임", 5) === "5월 중보기도팀 모임", "중보기도팀 표시 오류");
}
runSelfTests();

function App() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const [form, setForm] = useState(createEmptyForm());
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [meetingOptions] = useState(DEFAULT_MEETING_OPTIONS);
  const [meetingType, setMeetingType] = useState("연합기도회");
  const [meetingYear, setMeetingYear] = useState(currentYear);
  const [meetingMonth, setMeetingMonth] = useState(currentMonth);
  const [meetingTitle, setMeetingTitle] = useState(buildMeetingLabel("연합기도회", currentMonth));
  const [meetingKey, setMeetingKey] = useState(buildMeetingKey("연합기도회", currentYear, currentMonth));
  const [meetingTypeDraft, setMeetingTypeDraft] = useState("연합기도회");
  const [meetingYearDraft, setMeetingYearDraft] = useState(currentYear);
  const [meetingMonthDraft, setMeetingMonthDraft] = useState(currentMonth);
  const [newTeamName, setNewTeamName] = useState("");
  const [memberTeam, setMemberTeam] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [deleteTeamName, setDeleteTeamName] = useState("");
  const [deleteMemberTeam, setDeleteMemberTeam] = useState("");
  const [deleteMemberName, setDeleteMemberName] = useState("");
  const [responseList, setResponseList] = useState([]);
  const [notice, setNotice] = useState("");

  const currentResponses = useMemo(
    () => responseList.filter((item) => item.meetingKey === meetingKey),
    [responseList, meetingKey]
  );
  const availableMembers = form.team ? teams[form.team] || [] : [];
  const summary = useMemo(() => buildSummary(currentResponses), [currentResponses]);
  const attendancePercent = summary.total ? Math.round((summary.참석 / summary.total) * 100) : 0;
  const absentPercent = summary.total ? Math.round((summary.불참 / summary.total) * 100) : 0;
  const attendanceStyle = { 참석: "chip-success", 불참: "chip-danger" };

  useEffect(() => {
    if (!db) {
      setNotice("Firebase 환경변수가 아직 연결되지 않았습니다.");
      return;
    }

    // seedDefaultDataIfEmpty();

    const unsubTeams = onSnapshot(collection(db, "teams"), (snapshot) => {
      const next = {};
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.name) next[data.name] = data.members || [];
      });
      if (Object.keys(next).length) setTeams(next);
    });

    const unsubResponses = onSnapshot(collection(db, "responses"), (snapshot) => {
      const next = [];
      snapshot.forEach((d) => next.push({ id: d.id, ...d.data() }));
      next.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setResponseList(next);
    });

    const unsubSettings = onSnapshot(doc(db, "settings", "main"), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      if (data.meetingType && data.meetingYear && data.meetingMonth) {
        setMeetingType(data.meetingType);
        setMeetingYear(data.meetingYear);
        setMeetingMonth(data.meetingMonth);
        setMeetingTitle(data.meetingTitle || buildMeetingLabel(data.meetingType, data.meetingMonth));
        setMeetingKey(data.meetingKey || buildMeetingKey(data.meetingType, data.meetingYear, data.meetingMonth));
        setMeetingTypeDraft(data.meetingType);
        setMeetingYearDraft(data.meetingYear);
        setMeetingMonthDraft(data.meetingMonth);
      }
    });

    return () => {
      unsubTeams();
      unsubResponses();
      unsubSettings();
    };
  }, []);

  const resetFormIfNeeded = (teamName, memberName = "") => {
    if (form.team === teamName && (!memberName || form.name === memberName)) setForm(createEmptyForm());
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (!db) return alert("Firebase 연결이 필요합니다.");
    if (!form.team || !form.name.trim()) return alert("팀과 이름을 선택해주세요.");
    if (form.attendance === "불참" && !form.absentReason.trim()) return alert("불참 이유를 입력해주세요.");

    const next = {
      team: form.team,
      name: form.name.trim(),
      attendance: form.attendance,
      absentReason: form.attendance === "불참" ? form.absentReason.trim() : "",
      meetingType,
      meetingTitle,
      meetingKey,
      meetingMonth,
      year: meetingYear,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "responses", makeResponseId(next)), next);
    setForm(createEmptyForm());
    alert("제출 완료되었습니다!");
  }

  function handleAdminLogin(event) {
    event.preventDefault();
    if (adminId === ADMIN_ID && adminPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowAdminLogin(true);
      setAdminId("");
      setAdminPassword("");
      return;
    }
    alert("관리자 아이디 또는 비밀번호가 맞지 않습니다.");
  }

  async function handleUpdateMeetingTitle() {
    if (!db) return alert("Firebase 연결이 필요합니다.");
    const type = meetingTypeDraft.trim();
    const year = Number(meetingYearDraft);
    const month = Number(meetingMonthDraft);
    if (!type || !year || !month) return alert("모임 종류, 연도, 월을 선택해주세요.");

    await setDoc(doc(db, "settings", "main"), {
      meetingType: type,
      meetingYear: year,
      meetingMonth: month,
      meetingTitle: buildMeetingLabel(type, month),
      meetingKey: buildMeetingKey(type, year, month),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  async function handleAddTeam() {
    if (!db) return alert("Firebase 연결이 필요합니다.");
    const name = newTeamName.trim();
    if (!name) return alert("추가할 팀 이름을 입력해주세요.");
    if (teams[name]) return alert("이미 있는 팀입니다.");
    await setDoc(doc(db, "teams", safeId(name)), { name, members: [], updatedAt: new Date().toISOString() });
    setNewTeamName("");
    setMemberTeam(name);
  }

  async function handleAddMember() {
    if (!db) return alert("Firebase 연결이 필요합니다.");
    const name = newMemberName.trim();
    if (!memberTeam || !name) return alert("팀을 선택하고 추가할 이름을 입력해주세요.");
    if (teams[memberTeam]?.includes(name)) return alert("이미 해당 팀에 있는 이름입니다.");
    await setDoc(doc(db, "teams", safeId(memberTeam)), {
      name: memberTeam,
      members: [...(teams[memberTeam] || []), name],
      updatedAt: new Date().toISOString(),
    });
    setNewMemberName("");
  }

  async function handleDeleteTeam() {
    if (!db) return alert("Firebase 연결이 필요합니다.");
    if (!deleteTeamName) return alert("삭제할 팀을 선택해주세요.");
    await deleteDoc(doc(db, "teams", safeId(deleteTeamName)));
    await Promise.all(responseList.filter((r) => r.team === deleteTeamName).map((r) => deleteDoc(doc(db, "responses", r.id))));
    resetFormIfNeeded(deleteTeamName);
    if (memberTeam === deleteTeamName) setMemberTeam("");
    if (deleteMemberTeam === deleteTeamName) {
      setDeleteMemberTeam("");
      setDeleteMemberName("");
    }
    setDeleteTeamName("");
  }

  async function handleDeleteMember() {
    if (!db) return alert("Firebase 연결이 필요합니다.");
    if (!deleteMemberTeam || !deleteMemberName) return alert("삭제할 팀과 이름을 선택해주세요.");
    await setDoc(doc(db, "teams", safeId(deleteMemberTeam)), {
      name: deleteMemberTeam,
      members: (teams[deleteMemberTeam] || []).filter((m) => m !== deleteMemberName),
      updatedAt: new Date().toISOString(),
    });
    await Promise.all(responseList.filter((r) => r.team === deleteMemberTeam && r.name === deleteMemberName).map((r) => deleteDoc(doc(db, "responses", r.id))));
    resetFormIfNeeded(deleteMemberTeam, deleteMemberName);
    setDeleteMemberName("");
  }

  return (
    <main className="page">
      <div className="container">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="hero">
          <div className="heroTop">
            <div className="badge"><CalendarDays size={18} /> NCMN 중보기도팀</div>
            <Button type="button" variant="outline" onClick={() => setShowAdminLogin((p) => !p)}>
              <LockKeyhole size={17} /> 관리자 페이지
            </Button>
          </div>
          <h1>모임 참석 여부를 알려주세요!</h1>
          <p>팀을 선택한 후 본인 이름을 누르고 참석 여부를 남겨주세요.</p>
          <div className="meetingTitle">{meetingTitle}</div>
          {notice && <div className="notice">{notice}</div>}
        </motion.section>

        {showAdminLogin && (
          <Card>
            <h2><LockKeyhole size={22} /> 관리자 페이지</h2>
            {!isAdmin ? (
              <form onSubmit={handleAdminLogin} className="adminLogin">
                <input value={adminId} onChange={(e) => setAdminId(e.target.value)} placeholder="관리자 아이디" />
                <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="관리자 비밀번호" />
                <Button type="submit">확인</Button>
              </form>
            ) : (
              <div className="stack">
                <div className="adminStatus">
                  <span>관리자 모드입니다.</span>
                  <Button type="button" variant="outline" onClick={() => { setIsAdmin(false); setShowAdminLogin(false); }}>닫기</Button>
                </div>

                <div className="summaryGrid">
                  <div className="summary"><p>현재 모임</p><strong>{meetingTitle}</strong></div>
                  <div className="summary success"><p><CheckCircle2 size={16} /> 참석</p><strong>{summary.참석}</strong></div>
                  <div className="summary danger"><p><XCircle size={16} /> 불참</p><strong>{summary.불참}</strong></div>
                </div>

                <div className="panel">
                  <h3>참석 여부 차트</h3>
                  <Chart label="참석" count={summary.참석} percent={attendancePercent} tone="success" />
                  <Chart label="불참" count={summary.불참} percent={absentPercent} tone="danger" />
                </div>

                <div>
                  <h3>팀별 현황</h3>
                  <div className="grid2">
                    {Object.keys(teams).map((team) => {
                      const t = summary.teams[team] || { total: 0, 참석: 0, 불참: 0 };
                      return <div key={team} className="box"><strong>{team}</strong><p>총 {t.total}명 · 참석 {t.참석}명 · 불참 {t.불참}명</p></div>;
                    })}
                  </div>
                </div>

                <div>
                  <h3>응답 목록</h3>
                  <div className="list">
                    {currentResponses.length ? currentResponses.map((item, i) => (
                      <div key={`${item.team}-${item.name}-${i}`} className="box">
                        <div className="row"><strong>[{item.team}] {item.name}</strong><span className={`chip ${attendanceStyle[item.attendance]}`}>{item.attendance}</span></div>
                        <p className="purple">{item.meetingTitle} · {getResponseYear(item)}년</p>
                        {item.attendance === "불참" && item.absentReason && <p>불참 이유: {item.absentReason}</p>}
                      </div>
                    )) : <div className="empty">아직 제출된 응답이 없습니다.</div>}
                  </div>
                </div>

                <div className="panel">
                  <h3><Settings size={20} /> 정보 관리</h3>
                  <div className="manage">
                    <p><b>모임 변경</b></p>
                    <div className="options">
                      {meetingOptions.map((option) => <button key={option} type="button" onClick={() => setMeetingTypeDraft(option)} className={meetingTypeDraft === option ? "option active" : "option"}>{option}</button>)}
                    </div>
                    <div className="inputRow">
                      <select value={meetingYearDraft} onChange={(e) => setMeetingYearDraft(Number(e.target.value))}>
                        {YEAR_OPTIONS.map((year) => <option key={year} value={year}>{year}년</option>)}
                      </select>
                      <select value={meetingMonthDraft} onChange={(e) => setMeetingMonthDraft(Number(e.target.value))}>
                        {MONTH_OPTIONS.map((month) => <option key={month} value={month}>{month}월</option>)}
                      </select>
                      <Button type="button" onClick={handleUpdateMeetingTitle}>반영</Button>
                    </div>
                  </div>

                  <div className="grid2">
                    <Manage title="팀 추가"><div className="inputRow"><input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="새 팀 이름" /><Button type="button" onClick={handleAddTeam}>+ 추가</Button></div></Manage>
                    <Manage title="이름 추가"><select value={memberTeam} onChange={(e) => setMemberTeam(e.target.value)}><option value="">팀 선택</option>{Object.keys(teams).map((t) => <option key={t} value={t}>{t}</option>)}</select><div className="inputRow"><input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="추가할 이름" /><Button type="button" onClick={handleAddMember}>+ 추가</Button></div></Manage>
                    <Manage title="팀 삭제" danger><select value={deleteTeamName} onChange={(e) => setDeleteTeamName(e.target.value)}><option value="">삭제할 팀 선택</option>{Object.keys(teams).map((t) => <option key={t} value={t}>{t}</option>)}</select><Button type="button" variant="outline" onClick={handleDeleteTeam}>- 팀 삭제하기</Button></Manage>
                    <Manage title="이름 삭제" danger><select value={deleteMemberTeam} onChange={(e) => { setDeleteMemberTeam(e.target.value); setDeleteMemberName(""); }}><option value="">팀 선택</option>{Object.keys(teams).map((t) => <option key={t} value={t}>{t}</option>)}</select><select value={deleteMemberName} onChange={(e) => setDeleteMemberName(e.target.value)}><option value="">삭제할 이름 선택</option>{(teams[deleteMemberTeam] || []).map((m) => <option key={m} value={m}>{m}</option>)}</select><Button type="button" variant="outline" onClick={handleDeleteMember}>- 이름 삭제하기</Button></Manage>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {!showAdminLogin && (
          <Card>
            <h2><Send size={22} /> 참석 정보 입력</h2>
            <form onSubmit={handleSubmit} className="stack">
              <Section title="팀 선택"><div className="buttonGrid">{Object.keys(teams).map((team) => <button key={team} type="button" onClick={() => setForm({ ...form, team, name: "" })} className={form.team === team ? "choice active" : "choice"}>{team}</button>)}</div></Section>
              <Section title="이름 선택">
                <div className="buttonGrid">
                  {availableMembers.length ? availableMembers.map((member) => {
                    const submitted = responseList.some((r) => r.team === form.team && r.name === member && r.meetingKey === meetingKey);
                    return <button key={member} type="button" onClick={() => setForm({ ...form, name: member })} className={submitted ? "choice submitted" : form.name === member ? "choice selected" : "choice"}>{member}{submitted && <span>제출완료</span>}</button>;
                  }) : <div className="empty">먼저 팀을 선택해주세요</div>}
                </div>
              </Section>
              <Section title="참석 여부"><div className="buttonGrid two">{["참석", "불참"].map((a) => <button key={a} type="button" onClick={() => setForm({ ...form, attendance: a, absentReason: a === "불참" ? form.absentReason : "" })} className={form.attendance === a ? `choice ${a === "참석" ? "attend" : "absent"}` : "choice"}>{a}</button>)}</div></Section>
              {form.attendance === "불참" && <Section title="불참 이유"><textarea value={form.absentReason} onChange={(e) => setForm({ ...form, absentReason: e.target.value })} placeholder="불참 이유를 간단히 적어주세요" rows={4} /></Section>}
              <Button type="submit" className="submit">제출하기</Button>
            </form>
          </Card>
        )}
      </div>
    </main>
  );
}

function Chart({ label, count, percent, tone }) {
  return <div className="chart"><div className={`chartLabel ${tone}`}><span>{label}</span><span>{count}명 · {percent}%</span></div><div className={`bar ${tone}`}><div style={{ width: `${percent}%` }} /></div></div>;
}

function Manage({ title, children, danger = false }) {
  return <div className={danger ? "manage dangerPanel" : "manage"}><p><b>{title}</b></p>{children}</div>;
}

function Section({ title, children }) {
  return <div><label>{title}</label>{children}</div>;
}

createRoot(document.getElementById("root")).render(<App />);
