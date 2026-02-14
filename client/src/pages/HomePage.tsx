import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Sparkles, Github, ExternalLink, Loader2, CheckCircle2, 
  Building2, Cloud, History, Trash2, Play, Pause, RotateCcw,
  ChevronRight, FileText, Image, Send, Menu, X, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { apiClient, GenerateResult, HistoryRecord } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

type Step = 'idle' | 'generating' | 'completed' | 'history';
type DeployTarget = 'none' | 'github' | 'qiniu';

// 定义生成步骤
interface ProcessStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  duration?: string;
}

const DEFAULT_STEPS: ProcessStep[] = [
  { id: 'search', title: '搜索企业信息', description: '通过 AI 搜索获取企业相关信息', status: 'pending' },
  { id: 'analyze', title: 'AI 分析提取', description: '从搜索结果中提取关键企业信息', status: 'pending' },
  { id: 'generate', title: '生成官网', description: '使用模板生成企业官网页面', status: 'pending' },
  { id: 'deploy', title: '部署上线', description: '部署到七牛云存储', status: 'pending' },
];

interface HomePageProps {
  onResult?: (result: GenerateResult) => void;
}

export function HomePage({ onResult }: HomePageProps) {
  const [companyName, setCompanyName] = useState('');
  const [deployTarget, setDeployTarget] = useState<DeployTarget>('qiniu');
  const [step, setStep] = useState<Step>('idle');
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // 进度跟踪
  const [steps, setSteps] = useState<ProcessStep[]>(DEFAULT_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  // 步骤回放
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const playbackRef = useRef<NodeJS.Timeout | null>(null);

  // 加载历史记录
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await apiClient.getHistory();
      if (response.success && response.data) {
        setHistory(response.data);
      }
    } catch (e) {
      console.error('加载历史失败:', e);
    }
    setLoadingHistory(false);
  };

  // 初始化加载历史
  useEffect(() => {
    loadHistory();
  }, []);

  // 从历史记录加载
  const loadFromHistory = (record: HistoryRecord) => {
    setCompanyName(record.companyName);
    setDeployTarget(record.deployTarget as DeployTarget);
    setResult(record as unknown as GenerateResult);
    setStep('completed');
    setSteps(DEFAULT_STEPS.map(s => ({ ...s, status: 'completed' })));
  };

  // 删除历史记录
  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.deleteHistoryRecord(id);
      setHistory(history.filter(h => h.id !== id));
      toast({ title: '删除成功' });
    } catch (e) {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  // 开始生成
  const handleGenerate = async () => {
    if (!companyName.trim()) {
      toast({
        title: '请输入企业名称',
        description: '请输入要生成官网的企业名称',
        variant: 'destructive',
      });
      return;
    }

    // 重置状态
    setStep('generating');
    setError(null);
    setResult(null);
    setSteps(DEFAULT_STEPS.map((s, i) => ({ ...s, status: i === 0 ? 'running' : 'pending' })));
    setCurrentStepIndex(0);
    setStartTime(Date.now());
    setTotalDuration(0);
    setPlaybackIndex(0);

    try {
      const response = await apiClient.generateWebsite(companyName, deployTarget);

      if (response.success && response.data) {
        // 标记所有步骤完成
        setSteps(DEFAULT_STEPS.map(s => ({ ...s, status: 'completed', duration: '已完成' })));
        setResult(response.data);
        setTotalDuration(Date.now() - (startTime || Date.now()));
        setStep('completed');
        toast({
          title: '生成成功',
          description: deployTarget !== 'none' ? `官网已生成并部署到七牛云` : '官网已生成',
        });
        onResult?.(response.data);
        loadHistory(); // 刷新历史
      } else {
        throw new Error(response.message || '生成失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '生成失败';
      setError(errorMessage);
      setSteps(steps.map((s, i) => i === currentStepIndex ? { ...s, status: 'error' } : s));
      toast({
        title: '生成失败',
        description: errorMessage,
        variant: 'destructive',
      });
      setStep('idle');
    }
  };

  // 回放步骤
  const startPlayback = () => {
    if (step !== 'completed') return;
    setIsPlaying(true);
    setPlaybackIndex(0);
    
    playbackRef.current = setInterval(() => {
      setPlaybackIndex(prev => {
        if (prev >= steps.length - 1) {
          if (playbackRef.current) clearInterval(playbackRef.current);
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
  };

  const stopPlayback = () => {
    if (playbackRef.current) clearInterval(playbackRef.current);
    setIsPlaying(false);
  };

  // 复制链接
  const [copied, setCopied] = useState(false);
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 格式化时间
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}分${seconds % 60}秒`;
    }
    return `${seconds}秒`;
  };

  // 侧边栏菜单项
  const menuItems = [
    { id: 'home', icon: Building2, label: '首页' },
    { id: 'history', icon: History, label: '历史记录' },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* 左侧菜单 */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col`}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-semibold text-slate-900 dark:text-white">企业官网生成器</span>
            )}
          </div>
        </div>

        {/* 菜单 */}
        <nav className="flex-1 p-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'history') loadHistory();
                setStep(item.id === 'home' ? 'idle' : 'history');
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
                (step === 'idle' || step === 'generating' || step === 'completed') && item.id === 'home'
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                  : step === 'history' && item.id === 'history'
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* 切换按钮 */}
        <div className="p-2 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* 右侧主内容 */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* 历史记录页面 */}
          {step === 'history' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">历史记录</h2>
                <Button variant="outline" onClick={() => setStep('idle')}>
                  返回
                </Button>
              </div>

              {loadingHistory ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  <p className="mt-2 text-muted-foreground">加载中...</p>
                </div>
              ) : history.length === 0 ? (
                <Card className="p-8 text-center">
                  <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">暂无历史记录</p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {history.map((record) => (
                    <Card 
                      key={record.id} 
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => loadFromHistory(record)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{record.companyName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {record.companyInfo?.industry || '互联网/科技'} · {record.deployTarget === 'qiniu' ? '七牛云' : record.deployTarget === 'github' ? 'GitHub' : '本地'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleDeleteHistory(record.id, e)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* 首页/生成页面 */
            <div className="space-y-8">
              {/* 标题 */}
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  创建企业官网
                </h1>
                <p className="text-muted-foreground">
                  输入企业名称，AI 将自动搜索信息并生成精美官网
                </p>
              </div>

              {/* 输入区域 */}
              <Card className="border-2 border-slate-200 dark:border-slate-700">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label>企业名称</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="输入企业名称，如：华为、腾讯、阿里巴巴..."
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        disabled={step === 'generating'}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleGenerate}
                        disabled={step === 'generating' || !companyName.trim()}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                      >
                        {step === 'generating' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>部署方式</Label>
                    <RadioGroup
                      value={deployTarget}
                      onValueChange={(value) => setDeployTarget(value as DeployTarget)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="qiniu" id="qiniu" />
                        <Label htmlFor="qiniu" className="cursor-pointer flex items-center gap-1">
                          <Cloud className="w-4 h-4" />
                          七牛云
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="none" />
                        <Label htmlFor="none" className="cursor-pointer">
                          不部署
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>

              {/* 生成进度/结果 */}
              {(step === 'generating' || step === 'completed') && (
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {step === 'generating' ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                            正在生成官网...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            生成完成
                          </>
                        )}
                      </CardTitle>
                      {step === 'completed' && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={startPlayback} disabled={isPlaying}>
                            <Play className="w-4 h-4 mr-1" />
                            回放
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setStep('idle'); setCompanyName(''); }}>
                            <RotateCcw className="w-4 h-4 mr-1" />
                            新建
                          </Button>
                        </div>
                      )}
                    </div>
                    {step === 'completed' && totalDuration > 0 && (
                      <CardDescription>
                        总耗时: {formatDuration(totalDuration)}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 步骤进度 */}
                    <div className="space-y-3">
                      {steps.map((s, index) => (
                        <div 
                          key={s.id}
                          className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
                            index === playbackIndex && isPlaying
                              ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500'
                              : s.status === 'completed'
                              ? 'bg-green-50 dark:bg-green-900/20'
                              : s.status === 'running'
                              ? 'bg-blue-50 dark:bg-blue-900/20'
                              : s.status === 'error'
                              ? 'bg-red-50 dark:bg-red-900/20'
                              : 'bg-slate-50 dark:bg-slate-800/50'
                          }`}
                        >
                          {/* 状态图标 */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            s.status === 'completed' 
                              ? 'bg-green-500 text-white'
                              : s.status === 'running'
                              ? 'bg-blue-500 text-white animate-pulse'
                              : s.status === 'error'
                              ? 'bg-red-500 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                          }`}>
                            {s.status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : s.status === 'running' ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : s.status === 'error' ? (
                              <X className="w-4 h-4" />
                            ) : (
                              <span className="text-sm font-medium">{index + 1}</span>
                            )}
                          </div>
                          
                          {/* 步骤信息 */}
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${
                              s.status === 'completed' 
                                ? 'text-green-600 dark:text-green-400'
                                : s.status === 'running'
                                ? 'text-blue-600 dark:text-blue-400'
                                : s.status === 'error'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-slate-500'
                            }`}>
                              {s.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {s.description}
                            </p>
                          </div>
                          
                          {/* 状态文字 */}
                          <div className="text-xs text-muted-foreground flex-shrink-0">
                            {s.status === 'running' && '进行中...'}
                            {s.status === 'completed' && s.duration}
                            {s.status === 'error' && '失败'}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 生成结果 */}
                    {step === 'completed' && result && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="grid gap-4">
                          {/* 企业信息 */}
                          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                            <h3 className="font-semibold mb-2">{result.companyInfo?.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {result.companyInfo?.business}
                            </p>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>行业: {result.companyInfo?.industry}</span>
                              <span>文件: {result.generatedFiles?.length || 0} 个</span>
                            </div>
                          </div>

                          {/* 预览链接 */}
                          {result.previewUrl && (
                            <div className="flex items-center gap-2">
                              <Button 
                                className="flex-1" 
                                variant="default"
                                onClick={() => window.open(result.previewUrl, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                打开预览链接
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => copyToClipboard(result.previewUrl || '')}
                              >
                                {copied ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 错误信息 */}
                    {error && (
                      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                        <p className="font-medium">生成失败</p>
                        <p className="text-sm">{error}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 特性展示 */}
              {step === 'idle' && (
                <div className="grid md:grid-cols-3 gap-4 mt-12">
                  <Card className="text-center p-4">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 mb-2">
                      <Search className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold">智能搜索</h3>
                    <p className="text-sm text-muted-foreground">
                      AI 自动搜索企业信息
                    </p>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 mb-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="font-semibold">AI 生成</h3>
                    <p className="text-sm text-muted-foreground">
                      自动生成精美官网
                    </p>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 mb-2">
                      <Cloud className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="font-semibold">一键部署</h3>
                    <p className="text-sm text-muted-foreground">
                      部署到七牛云
                    </p>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
