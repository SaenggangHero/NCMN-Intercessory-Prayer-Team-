import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, LockKeyhole, XCircle, Send, Settings } from "lucide-react";
import "./style.css";

const INITIAL_TEAMS = {
  이스라엘팀: ["김예희", "박주학", "이경진", "이정옥", "이상민", "이진경", "최미숙"],
  사역기도문팀: ["홍현옥", "하경은", "김명숙", "김윤하", "김은혜", "김정아", "박가영", "신윤혁", "이다현", "한지연", "배성연"],
  진행팀: ["김지영", "조수아", "고은빈", "김선정", "배재옥", "유향미", "이은정", "이하늘", "홍민우"],
  비전센터팀: ["김지연", "오미해", "김미해", "김애숙", "김현진", "김혜림", "허은경", "윤에스라"],
  다음세대팀: ["황금례", "김영희", "박유리", "윤지혜"],
};

const DEFAULT_MEETING_OPTIONS = ["연합기도회", "NCMN 중보기도팀 모임"];
const ADMIN_ID = "김영신";
const ADMIN_PASSWORD = "1004";

function Button({ children, className = "", variant = "default", ...props }) {
  return (
    <button
      className={`btn ${variant === "outline" ? "btn-outline" : "btn-default"} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Card({ children, className = "" }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function createEmptyForm() {
  return { team: "", name: "", attendance: "참석", absentReason: "" };
}

function buildSummary(responseList) {
  return responseList.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.attendance] += 1;
      acc.teams[item.team] = acc.teams[item.team] || { total: 0, 참석: 0, 불참: 0 };
      acc.teams[item.team].total += 1;
      acc.teams[item.team][item.attendance] += 1;
      return acc;
    },
    { total: 0, 참석: 0, 불참: 0, teams: {} }
  );
}

function getResponseYear(item) {
  return item.year || new Date(item.createdAt || Date.now()).getFullYear();
}

function upsertResponse(responseList, nextResponse) {
  const withoutPrevious = responseList.filter(
    (item) =>
      !(
        item.team === nextResponse.team &&
        item.name === nextResponse.name &&
        item.meetingTitle === nextResponse.meetingTitle &&
        getResponseYear(item) === getResponseYear(nextResponse)
      )
  );
  return [...withoutPrevious, nextResponse];
}

function removeTeam(teamMap, teamName) {
  const next = { ...teamMap };
  delete next[teamName];
  return next;
}

function removeMember(teamMap, teamName, memberName) {
  return {
    ...teamMap,
    [teamName]: (teamMap[teamName] || []).filter((member) => member !== memberName),
  };
}

function getMainMeetingTitle(title) {
  return title === "NCMN 중보기도팀 모임" ? "중보기도팀 모임" : title;
}

export default function TeamMeetingAttendancePage() {
  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const [form, setForm] = useState(createEmptyForm());
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [meetingOptions] = useState(DEFAULT_MEETING_OPTIONS);
  const [meetingTitle, setMeetingTitle] = useState("연합기도회");
  const [meetingTitleDraft, setMeetingTitleDraft] = useState("연합기도회");
  const [newTeamName, setNewTeamName] = useState("");
  const [memberTeam, setMemberTeam] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [deleteTeamName, setDeleteTeamName] = useState("");
  const [deleteMemberTeam, setDeleteMemberTeam] = useState("");
  const [deleteMemberName, setDeleteMemberName] = useState("");
  const [responseList, setResponseList] = useState([]);

  const availableMembers = form.team ? teams[form.team] || [] : [];
  const summary = useMemo(() => buildSummary(responseList), [responseList]);
  const attendancePercent = summary.total ? Math.round((summary.참석 / summary.total) * 100) : 0;
  const absentPercent = summary.total ? Math.round((summary.불참 / summary.total) * 100) : 0;

  const attendanceStyle = {
    참석: "chip-success",
    불참: "chip-danger",
  };

  const resetFormIfNeeded = (teamName, memberName = "") => {
    if (form.team !== teamName) return;
    if (!memberName || form.name === memberName) setForm(createEmptyForm());
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.team || !form.name.trim()) {
      alert("팀과 이름을 선택해주세요.");
      return;
    }

    if (form.attendance === "불참" && !form.absentReason.trim()) {
      alert("불참 이유를 입력해주세요.");
      return;
    }

    const nextResponse = {
      team: form.team,
      name: form.name.trim(),
      attendance: form.attendance,
      absentReason: form.attendance === "불참" ? form.absentReason.trim() : "",
      meetingTitle,
      year: new Date().getFullYear(),
      createdAt: new Date().toISOString(),
    };

    setResponseList((prev) => upsertResponse(prev, nextResponse));
    setForm(createEmptyForm());
    alert("제출 완료되었습니다!");
  };

  const handleAdminLogin = (event) => {
    event.preventDefault();
    if (adminId === ADMIN_ID && adminPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowAdminLogin(true);
      setAdminId("");
      setAdminPassword("");
      return;
    }
    alert("관리자 아이디 또는 비밀번호가 맞지 않습니다.");
  };

  const handleUpdateMeetingTitle = () => {
    const title = meetingTitleDraft.trim();
    if (!title) {
      alert("모임 제목을 입력해주세요.");
      return;
    }
    setMeetingTitle(title);
  };

  const handleAddTeam = () => {
    const teamName = newTeamName.trim();
    if (!teamName) {
      alert("추가할 팀 이름을 입력해주세요.");
      return;
    }
    if (teams[teamName]) {
      alert("이미 있는 팀입니다.");
      return;
    }
    setTeams((prev) => ({ ...prev, [teamName]: [] }));
    setNewTeamName("");
    setMemberTeam(teamName);
  };

  const handleAddMember = () => {
    const name = newMemberName.trim();
    if (!memberTeam || !name) {
      alert("팀을 선택하고 추가할 이름을 입력해주세요.");
      return;
    }
    if (teams[memberTeam]?.includes(name)) {
      alert("이미 해당 팀에 있는 이름입니다.");
      return;
    }
    setTeams((prev) => ({ ...prev, [memberTeam]: [...(prev[memberTeam] || []), name] }));
    setNewMemberName("");
  };

  const handleDeleteTeam = () => {
    if (!deleteTeamName) {
      alert("삭제할 팀을 선택해주세요.");
      return;
    }
    setTeams((prev) => removeTeam(prev, deleteTeamName));
    setResponseList((prev) => prev.filter((item) => item.team !== deleteTeamName));
    resetFormIfNeeded(deleteTeamName);
    if (memberTeam === deleteTeamName) setMemberTeam("");
    if (deleteMemberTeam === deleteTeamName) {
      setDeleteMemberTeam("");
      setDeleteMemberName("");
    }
    setDeleteTeamName("");
  };

  const handleDeleteMember = () => {
    if (!deleteMemberTeam || !deleteMemberName) {
      alert("삭제할 팀과 이름을 선택해주세요.");
      return;
    }
    setTeams((prev) => removeMember(prev, deleteMemberTeam, deleteMemberName));
    setResponseList((prev) =>
      prev.filter((item) => !(item.team === deleteMemberTeam && item.name === deleteMemberName))
    );
    resetFormIfNeeded(deleteMemberTeam, deleteMemberName);
    setDeleteMemberName("");
  };

  return (
    <main className="page">
      <div className="container">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="hero"
        >
          <div className="hero-top">
            <div className="badge"><CalendarDays size={18} /> NCMN 중보기도팀</div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdminLogin((prev) => !prev)}
              className="admin-button"
            >
              <LockKeyhole size={17} /> 관리자 페이지
            </Button>
          </div>

          <h1>모임 참석 여부를 알려주세요!</h1>
          <p>팀을 선택한 후 본인 이름을 누르고 참석 여부를 남겨주세요.</p>
          <div className="meeting-title">{getMainMeetingTitle(meetingTitle)}</div>
        </motion.section>

        {showAdminLogin && (
          <Card className="admin-card">
            <h2><LockKeyhole size={22} /> 관리자 페이지</h2>

            {!isAdmin ? (
              <form onSubmit={handleAdminLogin} className="admin-login">
                <input value={adminId} onChange={(e) => setAdminId(e.target.value)} placeholder="관리자 아이디" />
                <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="관리자 비밀번호" />
                <Button type="submit">확인</Button>
              </form>
            ) : (
              <div className="stack">
                <div className="admin-status">
                  <span>관리자 모드입니다.</span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAdmin(false);
                      setShowAdminLogin(false);
                    }}
                  >
                    닫기
                  </Button>
                </div>

                <div className="summary-grid">
                  <div className="summary-box"><p>전체 응답</p><strong>{summary.total}</strong></div>
                  <div className="summary-box success"><p><CheckCircle2 size={16} /> 참석</p><strong>{summary.참석}</strong></div>
                  <div className="summary-box danger"><p><XCircle size={16} /> 불참</p><strong>{summary.불참}</strong></div>
                </div>

                <div className="panel">
                  <h3>참석 여부 차트</h3>
                  <div className="chart-row">
                    <div className="chart-label success-text"><span>참석</span><span>{summary.참석}명 · {attendancePercent}%</span></div>
                    <div className="bar-bg success-bg"><div className="bar-fill success-fill" style={{ width: `${attendancePercent}%` }} /></div>
                  </div>
                  <div className="chart-row">
                    <div className="chart-label danger-text"><span>불참</span><span>{summary.불참}명 · {absentPercent}%</span></div>
                    <div className="bar-bg danger-bg"><div className="bar-fill danger-fill" style={{ width: `${absentPercent}%` }} /></div>
                  </div>
                </div>

                <div>
                  <h3>팀별 현황</h3>
                  <div className="team-status-grid">
                    {Object.keys(teams).map((team) => {
                      const teamSummary = summary.teams[team] || { total: 0, 참석: 0, 불참: 0 };
                      return (
                        <div key={team} className="team-status">
                          <strong>{team}</strong>
                          <p>총 {teamSummary.total}명 · 참석 {teamSummary.참석}명 · 불참 {teamSummary.불참}명</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3>응답 목록</h3>
                  <div className="response-list">
                    {responseList.length ? responseList.map((item, index) => (
                      <div key={`${item.team}-${item.name}-${index}`} className="response-item">
                        <div className="response-head">
                          <strong>[{item.team}] {item.name}</strong>
                          <span className={`chip ${attendanceStyle[item.attendance]}`}>{item.attendance}</span>
                        </div>
                        <p className="response-meeting">{item.meetingTitle} · {getResponseYear(item)}년</p>
                        {item.attendance === "불참" && item.absentReason && <p>불참 이유: {item.absentReason}</p>}
                      </div>
                    )) : (
                      <div className="empty">아직 제출된 응답이 없습니다.</div>
                    )}
                  </div>
                </div>

                <div className="panel">
                  <h3><Settings size={20} /> 정보 관리</h3>

                  <div className="manage-section">
                    <p>모임 변경</p>
                    <div className="option-buttons">
                      {meetingOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setMeetingTitleDraft(option)}
                          className={meetingTitleDraft === option ? "option active" : "option"}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <div className="input-row">
                      <input value={meetingTitleDraft} onChange={(e) => setMeetingTitleDraft(e.target.value)} placeholder="모임 이름 입력" />
                      <Button type="button" onClick={handleUpdateMeetingTitle}>반영</Button>
                    </div>
                  </div>

                  <div className="manage-grid">
                    <div className="manage-section">
                      <p>팀 추가</p>
                      <div className="input-row">
                        <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="새 팀 이름" />
                        <Button type="button" onClick={handleAddTeam}>+ 추가</Button>
                      </div>
                    </div>

                    <div className="manage-section">
                      <p>이름 추가</p>
                      <select value={memberTeam} onChange={(e) => setMemberTeam(e.target.value)}>
                        <option value="">팀 선택</option>
                        {Object.keys(teams).map((team) => <option key={team} value={team}>{team}</option>)}
                      </select>
                      <div className="input-row">
                        <input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="추가할 이름" />
                        <Button type="button" onClick={handleAddMember}>+ 추가</Button>
                      </div>
                    </div>

                    <div className="manage-section danger-panel">
                      <p>팀 삭제</p>
                      <select value={deleteTeamName} onChange={(e) => setDeleteTeamName(e.target.value)}>
                        <option value="">삭제할 팀 선택</option>
                        {Object.keys(teams).map((team) => <option key={team} value={team}>{team}</option>)}
                      </select>
                      <Button type="button" variant="outline" onClick={handleDeleteTeam}>- 팀 삭제하기</Button>
                    </div>

                    <div className="manage-section danger-panel">
                      <p>이름 삭제</p>
                      <select value={deleteMemberTeam} onChange={(e) => { setDeleteMemberTeam(e.target.value); setDeleteMemberName(""); }}>
                        <option value="">팀 선택</option>
                        {Object.keys(teams).map((team) => <option key={team} value={team}>{team}</option>)}
                      </select>
                      <select value={deleteMemberName} onChange={(e) => setDeleteMemberName(e.target.value)}>
                        <option value="">삭제할 이름 선택</option>
                        {(teams[deleteMemberTeam] || []).map((member) => <option key={member} value={member}>{member}</option>)}
                      </select>
                      <Button type="button" variant="outline" onClick={handleDeleteMember}>- 이름 삭제하기</Button>
                    </div>
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
              <div>
                <label>팀 선택</label>
                <div className="button-grid">
                  {Object.keys(teams).map((team) => (
                    <button key={team} type="button" onClick={() => setForm({ ...form, team, name: "" })} className={form.team === team ? "choice active" : "choice"}>{team}</button>
                  ))}
                </div>
              </div>

              <div>
                <label>이름 선택</label>
                <div className="button-grid names">
                  {availableMembers.length ? availableMembers.map((member) => {
                    const submitted = responseList.some((item) => item.team === form.team && item.name === member);
                    return (
                      <button
                        key={member}
                        type="button"
                        onClick={() => setForm({ ...form, name: member })}
                        className={submitted ? "choice submitted" : form.name === member ? "choice selected" : "choice"}
                      >
                        {member}{submitted && <span>제출완료</span>}
                      </button>
                    );
                  }) : <div className="empty">먼저 팀을 선택해주세요</div>}
                </div>
              </div>

              <div>
                <label>참석 여부</label>
                <div className="button-grid two">
                  {["참석", "불참"].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setForm({ ...form, attendance: item, absentReason: item === "불참" ? form.absentReason : "" })}
                      className={form.attendance === item ? `choice ${item === "참석" ? "attend" : "absent"}` : "choice"}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {form.attendance === "불참" && (
                <div>
                  <label>불참 이유</label>
                  <textarea value={form.absentReason} onChange={(e) => setForm({ ...form, absentReason: e.target.value })} placeholder="불참 이유를 간단히 적어주세요" rows={4} />
                </div>
              )}

              <Button type="submit" className="submit-button">제출하기</Button>
            </form>
          </Card>
        )}
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<TeamMeetingAttendancePage />);
