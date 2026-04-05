import React, { useState, useEffect } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import {
  Wallet,
  QrCode,
  Send,
  Building2,
  Users,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  LogOut,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  X,
} from "lucide-react";

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCo7hYO-CosKWrpqwHZBQB2jEERco_HgQU",
  authDomain: "banco-imobiliario-21afe.firebaseapp.com",
  projectId: "banco-imobiliario-21afe",
  storageBucket: "banco-imobiliario-21afe.firebasestorage.app",
  messagingSenderId: "789164934774",
  appId: "1:789164934774:web:5823191188ca8cd5b0c157",
  measurementId: "G-6V23VXCRQ2",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "monopoly-bank-app";

// --- FUNÇÕES AUXILIARES DE MOEDA ---
const formatCurrencyInput = (value) => {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits === "") return "";
  const numberValue = parseInt(digits, 10) / 100;
  return numberValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const parseCurrency = (value) => {
  if (!value) return 0;
  const digits = value.replace(/\D/g, "");
  return parseInt(digits, 10) / 100;
};

// --- COMPONENTES DE UI ---
const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
}) => {
  const baseStyle =
    "w-full py-3 px-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg",
    secondary:
      "bg-white hover:bg-gray-50 text-indigo-600 border-2 border-indigo-100",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-lg",
    bank: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  required = false,
}) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-gray-700 mb-1">
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
    />
  </div>
);

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados Globais de Dados
  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Estados de Navegação e Sessão
  const [currentView, setCurrentView] = useState("home"); // home, create, join, login, dashboard, bank
  const [activeGameCode, setActiveGameCode] = useState("");
  const [localUser, setLocalUser] = useState(null);
  const [notification, setNotification] = useState(null);

  // Inicialização do Firebase Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Erro na autenticação:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sincronização de Dados (Firestore)
  useEffect(() => {
    if (!firebaseUser) return;

    const gamesRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "mono_games"
    );
    const playersRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "mono_players"
    );
    const transRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "mono_transactions"
    );

    const unsubGames = onSnapshot(
      gamesRef,
      (snap) => setGames(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error(err)
    );
    const unsubPlayers = onSnapshot(
      playersRef,
      (snap) => setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error(err)
    );
    const unsubTrans = onSnapshot(
      transRef,
      (snap) =>
        setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error(err)
    );

    return () => {
      unsubGames();
      unsubPlayers();
      unsubTrans();
    };
  }, [firebaseUser]);

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const getInitials = (name) => {
    if (!name) return "??";
    return name.substring(0, 2).toUpperCase();
  };

  // --- FUNÇÕES DE AÇÃO ---

  const handleCreateGame = async (numPlayers, initialBalance) => {
    if (!firebaseUser) return;
    const code = generateCode();

    // Cria o jogo
    await setDoc(
      doc(db, "artifacts", appId, "public", "data", "mono_games", code),
      {
        code,
        numPlayers: parseInt(numPlayers),
        initialBalance: parseFloat(initialBalance),
        createdAt: new Date().toISOString(),
      }
    );

    // Cria o usuário do banco
    const bankNickname = `banco_${code}`;
    const bankId = `${code}_bank`;
    await setDoc(
      doc(db, "artifacts", appId, "public", "data", "mono_players", bankId),
      {
        gameCode: code,
        nickname: bankNickname,
        password: "1234",
        role: "bank",
        balance: 999999999, // Banco tem dinheiro "infinito"
        name: "Banco Central",
        color: "#10b981", // Verde
      }
    );

    setActiveGameCode(code);
    showNotification(`Jogo criado com sucesso!`);
    setCurrentView("game_created");
  };

  const handleJoinGame = (code) => {
    const game = games.find((g) => g.code === code.toUpperCase());
    if (game) {
      setActiveGameCode(game.code);
      setCurrentView("login");
    } else {
      showNotification("Código do jogo não encontrado.", "error");
    }
  };

  const handleLoginOrRegister = async (formData) => {
    const { nickname, password, isRegistering, name, color } = formData;
    const game = games.find((g) => g.code === activeGameCode);

    // Verifica se é o banco
    if (nickname === `banco_${activeGameCode}`) {
      const bankUser = players.find(
        (p) => p.gameCode === activeGameCode && p.nickname === nickname
      );
      if (bankUser && bankUser.password === password) {
        setLocalUser(bankUser);
        setCurrentView("bank");
        return;
      } else {
        showNotification("Senha do banco incorreta.", "error");
        return;
      }
    }

    const existingPlayer = players.find(
      (p) => p.gameCode === activeGameCode && p.nickname === nickname
    );

    if (isRegistering) {
      if (existingPlayer) {
        showNotification("Apelido já em uso neste jogo.", "error");
        return;
      }

      const gamePlayersCount = players.filter(
        (p) => p.gameCode === activeGameCode && p.role !== "bank"
      ).length;
      if (gamePlayersCount >= game.numPlayers) {
        showNotification("O jogo já atingiu o limite de jogadores.", "error");
        return;
      }

      const newPlayerId = `${activeGameCode}_${nickname}`;
      const newPlayer = {
        gameCode: activeGameCode,
        nickname,
        password,
        name,
        color,
        role: "player",
        balance: game.initialBalance,
      };

      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "mono_players",
          newPlayerId
        ),
        newPlayer
      );
      setLocalUser({ id: newPlayerId, ...newPlayer });
      setCurrentView("dashboard");
      showNotification("Conta criada com sucesso!");
    } else {
      if (!existingPlayer) {
        showNotification("Jogador não encontrado.", "error");
        return;
      }
      if (existingPlayer.password !== password) {
        showNotification("Senha incorreta.", "error");
        return;
      }
      setLocalUser(existingPlayer);
      setCurrentView("dashboard");
      showNotification("Bem-vindo de volta!");
    }
  };

  const handleTransfer = async (
    fromPlayerId,
    toPlayerId,
    amount,
    description = "Transferência Pix"
  ) => {
    if (amount <= 0 || !fromPlayerId || !toPlayerId) return false;

    const fromPlayer = players.find((p) => p.id === fromPlayerId);
    const toPlayer = players.find((p) => p.id === toPlayerId);

    if (!fromPlayer || !toPlayer) return false;

    // Jogador comum não pode transferir mais do que tem (Banco pode)
    if (fromPlayer.role !== "bank" && fromPlayer.balance < amount) {
      showNotification("Saldo insuficiente!", "error");
      return false;
    }

    try {
      const fromRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "mono_players",
        fromPlayer.id
      );
      const toRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "mono_players",
        toPlayer.id
      );

      await updateDoc(fromRef, {
        balance: Number(fromPlayer.balance) - Number(amount),
      });
      await updateDoc(toRef, {
        balance: Number(toPlayer.balance) + Number(amount),
      });

      await addDoc(
        collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "mono_transactions"
        ),
        {
          gameCode: activeGameCode,
          fromId: fromPlayer.id,
          fromName: fromPlayer.nickname,
          toId: toPlayer.id,
          toName: toPlayer.nickname,
          amount: Number(amount),
          timestamp: new Date().toISOString(),
          description,
        }
      );

      showNotification("Transferência realizada com sucesso!");
      return true;
    } catch (err) {
      console.error(err);
      showNotification("Erro ao processar transferência.", "error");
      return false;
    }
  };

  // --- TELAS ---

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-indigo-600 font-bold">
        Carregando Sistema...
      </div>
    );

  const renderNotification = () => {
    if (!notification) return null;
    return (
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-xl flex items-center gap-2 text-white font-medium animate-bounce ${
          notification.type === "error" ? "bg-red-600" : "bg-green-600"
        }`}
      >
        {notification.type === "error" ? (
          <AlertTriangle size={20} />
        ) : (
          <CheckCircle2 size={20} />
        )}
        {notification.msg}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {renderNotification()}

      {currentView === "home" && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-900 to-indigo-700">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
              <Building2 size={40} />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              Banco Imobiliário
            </h1>
            <p className="text-gray-500 mb-8 font-medium">
              O seu sistema bancário digital para o jogo de tabuleiro.
            </p>

            <div className="space-y-4">
              <Button
                onClick={() => setCurrentView("create")}
                variant="primary"
              >
                Criar Novo Jogo
              </Button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">
                  OU
                </span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleJoinGame(e.target.code.value);
                }}
              >
                <Input
                  label="Já tem um código?"
                  name="code"
                  required
                  placeholder="Digite o código da sala"
                />
                <Button type="submit" variant="secondary">
                  Acessar Jogo / Login
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {currentView === "create" && (
        <div className="min-h-screen flex flex-col p-6 max-w-md mx-auto">
          <button
            onClick={() => setCurrentView("home")}
            className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium"
          >
            <ArrowLeft size={20} /> Voltar
          </button>
          <div className="bg-white p-6 rounded-3xl shadow-xl">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-indigo-700">
              <Building2 /> Configurar Jogo
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateGame(
                  e.target.players.value,
                  parseCurrency(e.target.balance.value)
                );
              }}
            >
              <Input
                label="Número de Jogadores"
                type="number"
                name="players"
                required
                placeholder="Ex: 6"
              />
              <Input
                label="Valor Inicial (Dinheiro)"
                type="text"
                name="balance"
                required
                placeholder="0,00"
                onChange={(e) => {
                  e.target.value = formatCurrencyInput(e.target.value);
                }}
              />
              <Button type="submit" className="mt-4">
                Gerar Código do Jogo
              </Button>
            </form>
          </div>
        </div>
      )}

      {currentView === "game_created" && (
        <div className="min-h-screen flex flex-col p-6 max-w-md mx-auto justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Jogo Criado!</h2>
            <p className="text-sm text-gray-500 mb-6">
              Compartilhe o código abaixo com os outros jogadores para eles
              entrarem na sala:
            </p>

            <div className="bg-gray-100 px-6 py-4 rounded-2xl mb-8 border-2 border-dashed border-gray-300">
              <span className="text-4xl font-mono font-black tracking-widest text-indigo-700">
                {activeGameCode}
              </span>
            </div>

            <Button onClick={() => setCurrentView("login")} variant="primary">
              Entrar na Sala Agora
            </Button>
          </div>
        </div>
      )}

      {currentView === "login" && (
        <div className="min-h-screen flex flex-col p-6 max-w-md mx-auto justify-center">
          <button
            onClick={() => setCurrentView("home")}
            className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium"
          >
            <ArrowLeft size={20} /> Voltar
          </button>
          <div className="bg-white p-6 rounded-3xl shadow-xl">
            <h2 className="text-2xl font-bold mb-2">Identificação</h2>
            <p className="text-sm text-gray-500 mb-6">
              Sala:{" "}
              <span className="font-bold text-indigo-600">
                {activeGameCode}
              </span>
            </p>

            <LoginRegisterForm onSubmit={handleLoginOrRegister} />
          </div>
        </div>
      )}

      {currentView === "dashboard" && localUser && (
        <PlayerDashboard
          user={players.find((p) => p.id === localUser.id) || localUser}
          players={players.filter(
            (p) => p.gameCode === activeGameCode && p.id !== localUser.id
          )}
          transactions={transactions.filter(
            (t) =>
              t.gameCode === activeGameCode &&
              (t.fromId === localUser.id || t.toId === localUser.id)
          )}
          onTransfer={handleTransfer}
          onLogout={() => {
            setLocalUser(null);
            setCurrentView("home");
            setActiveGameCode("");
          }}
        />
      )}

      {currentView === "bank" && localUser && (
        <BankDashboard
          bankUser={players.find((p) => p.id === localUser.id) || localUser}
          players={players.filter(
            (p) => p.gameCode === activeGameCode && p.role !== "bank"
          )}
          transactions={transactions.filter(
            (t) => t.gameCode === activeGameCode
          )}
          onTransfer={handleTransfer}
          onLogout={() => {
            setLocalUser(null);
            setCurrentView("home");
            setActiveGameCode("");
          }}
        />
      )}
    </div>
  );
}

// --- SUB-COMPONENTES DAS TELAS ---

const LoginRegisterForm = ({ onSubmit }) => {
  const [isNew, setIsNew] = useState(false);
  const [formData, setFormData] = useState({
    nickname: "",
    password: "",
    name: "",
    color: "#ef4444",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, isRegistering: isNew });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Apelido / Usuário"
        value={formData.nickname}
        onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
        required
      />
      <Input
        label="Senha"
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
      />

      {isNew && (
        <div className="animate-fade-in">
          <Input
            label="Nome Completo"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required={isNew}
          />
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Cor do Peão
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                "#ef4444",
                "#3b82f6",
                "#10b981",
                "#eab308",
                "#a855f7",
                "#f97316",
                "#ec4899",
                "#06b6d4",
                "#84cc16",
                "#78350f",
                "#000000",
                "#64748b",
              ].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: c })}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    formData.color === c
                      ? "scale-125 border-gray-800"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <Button type="submit" className="mb-4">
        {isNew ? "Cadastrar e Entrar" : "Entrar"}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setIsNew(!isNew)}
          className="text-sm text-indigo-600 font-semibold hover:underline"
        >
          {isNew
            ? "Já tenho uma conta nesta sala"
            : "Quero me cadastrar nesta sala"}
        </button>
      </div>
    </form>
  );
};

const PlayerDashboard = ({
  user,
  players,
  transactions,
  onTransfer,
  onLogout,
}) => {
  const [activeModal, setActiveModal] = useState(null); // 'pix', 'qr', 'history'
  const isBankrupt = user.balance <= 0;

  const formatMoney = (val) =>
    Number(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div
      className={`min-h-screen relative flex flex-col ${
        isBankrupt ? "bg-red-900" : "bg-gray-100"
      }`}
    >
      {/* Background Watermark for Bankrupt */}
      {isBankrupt && (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none opacity-20">
          <span className="text-[150px] font-black text-red-500 -rotate-45 tracking-widest">
            FALIDO
          </span>
        </div>
      )}

      {/* HEADER BANCÁRIO */}
      <div
        className={`pt-12 pb-24 px-6 rounded-b-[40px] shadow-lg relative z-10 ${
          isBankrupt ? "bg-red-800 text-red-100" : "bg-indigo-700 text-white"
        }`}
      >
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-sm opacity-80 font-medium mb-1">
              Saldo em Conta
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight">
              {formatMoney(user.balance)}
            </h1>
          </div>
          <div className="flex flex-col items-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner border-2 border-white/20"
              style={{ backgroundColor: user.color }}
            >
              {user.name
                ? user.name.substring(0, 2).toUpperCase()
                : user.nickname.substring(0, 2).toUpperCase()}
            </div>
            <span className="text-xs mt-2 font-medium opacity-90">
              {user.nickname}
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="absolute top-4 right-4 opacity-70 hover:opacity-100 transition-opacity"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* QUICK ACTIONS */}
      <div className="px-6 -mt-12 relative z-20 grid grid-cols-3 gap-3">
        <button
          onClick={() => setActiveModal("qr")}
          className="bg-white p-3 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <QrCode size={20} />
          </div>
          <span className="font-semibold text-gray-800 text-xs text-center">
            Cobrar
          </span>
        </button>
        <button
          onClick={() => setActiveModal("pix")}
          className="bg-white p-3 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          disabled={isBankrupt}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isBankrupt
                ? "bg-gray-200 text-gray-400"
                : "bg-indigo-100 text-indigo-600"
            }`}
          >
            <Send size={20} />
          </div>
          <span
            className={`font-semibold text-xs text-center ${
              isBankrupt ? "text-gray-400" : "text-gray-800"
            }`}
          >
            Fazer Pix
          </span>
        </button>
        <button
          onClick={() => setActiveModal("history")}
          className="bg-white p-3 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
            <History size={20} />
          </div>
          <span className="font-semibold text-gray-800 text-xs text-center">
            Extrato
          </span>
        </button>
      </div>

      {isBankrupt && (
        <div className="m-6 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-xl flex items-center gap-3 relative z-20 shadow-sm">
          <AlertTriangle className="shrink-0" />
          <p className="text-sm font-bold">
            Atenção: Você faliu! Não é possível realizar pagamentos, apenas
            receber.
          </p>
        </div>
      )}

      {/* MODAIS */}
      {activeModal === "qr" && (
        <Modal
          title="Seu QR Code de Cobrança"
          onClose={() => setActiveModal(null)}
        >
          <div className="flex flex-col items-center py-6">
            <div className="bg-white p-4 rounded-xl border-4 border-indigo-600 shadow-sm mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${user.nickname}`}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>
            <p className="text-center text-gray-600 text-sm mb-4">
              Mostre esta tela para quem vai te pagar. O jogador pode buscar seu
              apelido no Pix.
            </p>
            <div className="bg-gray-100 px-6 py-3 rounded-full font-mono text-xl font-bold tracking-wider text-gray-800 border border-gray-200">
              {user.nickname}
            </div>
          </div>
        </Modal>
      )}

      {activeModal === "pix" && (
        <TransferModal
          title="Fazer Pix"
          players={players}
          onClose={() => setActiveModal(null)}
          onConfirm={async (toId, amount) => {
            const success = await onTransfer(
              user.id,
              toId,
              amount,
              "Transferência Pix"
            );
            if (success) setActiveModal(null);
          }}
        />
      )}

      {activeModal === "history" && (
        <Modal title="Seu Extrato" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {transactions.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                Nenhuma transação realizada.
              </p>
            )}
            {[...transactions]
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .map((t) => {
                const isIncoming = t.toId === user.id;
                return (
                  <div
                    key={t.id}
                    className="p-3 border border-gray-100 bg-gray-50 rounded-xl text-sm flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          isIncoming
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {isIncoming ? (
                          <ArrowDownCircle size={20} />
                        ) : (
                          <ArrowUpCircle size={20} />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">
                          {isIncoming
                            ? `Recebido de ${t.fromName}`
                            : `Enviado para ${t.toName}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(t.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-bold ${
                        isIncoming ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isIncoming ? "+" : "-"}
                      {formatMoney(t.amount)}
                    </span>
                  </div>
                );
              })}
          </div>
        </Modal>
      )}
    </div>
  );
};

const BankDashboard = ({
  bankUser,
  players,
  transactions,
  onTransfer,
  onLogout,
}) => {
  const [activeModal, setActiveModal] = useState(null); // 'participants', 'charge', 'pay', 'history'

  const formatMoney = (val) =>
    Number(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleBankTransfer = async (playerId, amount, isPayingPlayer) => {
    // If paying player: bank -> player. If charging player: player -> bank.
    const fromId = isPayingPlayer ? bankUser.id : playerId;
    const toId = isPayingPlayer ? playerId : bankUser.id;
    const desc = isPayingPlayer ? "Pagamento do Banco" : "Cobrança do Banco";

    const success = await onTransfer(fromId, toId, amount, desc);
    if (success) setActiveModal(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-700 text-white pt-8 pb-16 px-6 rounded-b-[40px] shadow-lg relative">
        <div className="flex items-center gap-3 mb-6">
          <Building2 size={32} />
          <h1 className="text-2xl font-bold tracking-wide">Banco Central</h1>
        </div>
        <p className="text-emerald-100 text-sm mb-1">Status da Sessão</p>
        <p className="font-semibold text-lg opacity-90">
          {players.length} Participantes Ativos
        </p>
        <button
          onClick={onLogout}
          className="absolute top-8 right-6 bg-emerald-800 p-2 rounded-full hover:bg-emerald-900 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </div>

      <div className="px-6 -mt-8 relative z-20 grid grid-cols-2 gap-4">
        <button
          onClick={() => setActiveModal("participants")}
          className="bg-white p-5 rounded-2xl shadow-md flex flex-col items-center gap-3 border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all"
        >
          <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
            <Users size={24} />
          </div>
          <span className="font-bold text-gray-800">Participantes</span>
        </button>
        <button
          onClick={() => setActiveModal("charge")}
          className="bg-white p-5 rounded-2xl shadow-md flex flex-col items-center gap-3 border border-gray-100 hover:border-red-200 hover:shadow-lg transition-all"
        >
          <div className="bg-red-100 text-red-600 p-3 rounded-full">
            <ArrowDownCircle size={24} />
          </div>
          <span className="font-bold text-gray-800">Cobrar</span>
        </button>
        <button
          onClick={() => setActiveModal("pay")}
          className="bg-white p-5 rounded-2xl shadow-md flex flex-col items-center gap-3 border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all"
        >
          <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full">
            <ArrowUpCircle size={24} />
          </div>
          <span className="font-bold text-gray-800">Pagar</span>
        </button>
        <button
          onClick={() => setActiveModal("history")}
          className="bg-white p-5 rounded-2xl shadow-md flex flex-col items-center gap-3 border border-gray-100 hover:border-purple-200 hover:shadow-lg transition-all"
        >
          <div className="bg-purple-100 text-purple-600 p-3 rounded-full">
            <History size={24} />
          </div>
          <span className="font-bold text-gray-800">Extrato</span>
        </button>
      </div>

      {/* Modais do Banco */}
      {activeModal === "participants" && (
        <Modal
          title="Lista de Participantes"
          onClose={() => setActiveModal(null)}
        >
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {players.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                Nenhum jogador na sala.
              </p>
            )}
            {players.map((p) => (
              <div
                key={p.id}
                className={`flex justify-between items-center p-4 rounded-xl border ${
                  p.balance <= 0
                    ? "bg-red-50 border-red-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.nickname.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 leading-tight">
                      {p.nickname}
                    </p>
                    {p.balance <= 0 && (
                      <span className="text-[10px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                        FALIDO
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`font-bold ${
                    p.balance <= 0 ? "text-red-600" : "text-gray-900"
                  }`}
                >
                  {formatMoney(p.balance)}
                </span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {activeModal === "charge" && (
        <TransferModal
          title="Cobrar Jogador"
          players={players}
          onClose={() => setActiveModal(null)}
          onConfirm={(id, amt) => handleBankTransfer(id, amt, false)}
          isBankAction={true}
          buttonText="Retirar da Conta"
          buttonVariant="danger"
        />
      )}

      {activeModal === "pay" && (
        <TransferModal
          title="Pagar Jogador"
          players={players}
          onClose={() => setActiveModal(null)}
          onConfirm={(id, amt) => handleBankTransfer(id, amt, true)}
          isBankAction={true}
          buttonText="Adicionar na Conta"
          buttonVariant="bank"
        />
      )}

      {activeModal === "history" && (
        <Modal
          title="Histórico de Transações"
          onClose={() => setActiveModal(null)}
        >
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {transactions.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                Nenhuma transação realizada.
              </p>
            )}
            {[...transactions]
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .map((t) => (
                <div
                  key={t.id}
                  className="p-3 border border-gray-100 bg-gray-50 rounded-xl text-sm"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-gray-800">
                      {formatMoney(t.amount)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(t.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="text-gray-600 flex items-center gap-1 flex-wrap">
                    <span className="font-medium text-gray-800">
                      {t.fromName}
                    </span>
                    <ArrowLeft
                      size={12}
                      className="rotate-180 inline text-gray-400"
                    />
                    <span className="font-medium text-gray-800">
                      {t.toName}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

// --- COMPONENTES AUXILIARES ---

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="flex justify-between items-center p-6 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        <button
          onClick={onClose}
          className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      <div className="p-6 overflow-y-auto flex-1">{children}</div>
    </div>
  </div>
);

const TransferModal = ({
  title,
  players,
  onClose,
  onConfirm,
  isBankAction = false,
  buttonText = "Confirmar Transferência",
  buttonVariant = "primary",
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [amount, setAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedAmount = parseCurrency(amount);
    if (!selectedPlayer || parsedAmount <= 0) return;
    onConfirm(selectedPlayer, parsedAmount);
  };

  const filteredPlayers = players.filter(
    (p) =>
      p.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Selecionar Participante
          </label>

          <input
            type="text"
            placeholder="🔍 Digite o apelido ou escaneie o QR"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 mb-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-gray-50"
          />

          <div className="space-y-2 max-h-48 overflow-y-auto p-1">
            {filteredPlayers.length === 0 && (
              <p className="text-sm text-gray-500">
                Nenhum jogador encontrado.
              </p>
            )}
            {filteredPlayers.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPlayer(p.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedPlayer === p.id
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-gray-100 bg-white hover:border-indigo-200"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: p.color }}
                >
                  {p.nickname.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-sm">
                    {p.nickname}
                  </p>
                </div>
                {isBankAction && p.balance <= 0 && (
                  <span className="text-[10px] font-black text-red-600">
                    FALIDO
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Valor
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
              R$
            </span>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
              placeholder="0,00"
              required
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-600 focus:ring-0 outline-none text-xl font-bold text-gray-800 transition-colors"
            />
          </div>
        </div>

        <Button
          type="submit"
          variant={buttonVariant}
          className="mt-2"
          disabled={!selectedPlayer || parseCurrency(amount) <= 0}
        >
          {buttonText}
        </Button>
      </form>
    </Modal>
  );
};
