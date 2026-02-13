import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Github, ExternalLink, Loader2, CheckCircle2, Building2, Cloud, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { apiClient, GenerateResult, SearchResult, HistoryRecord } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

type Step = 'idle' | 'searching' | 'generating' | 'completed' | 'history';
type DeployTarget = 'none' | 'github' | 'qiniu';

interface HomePageProps {
  onResult?: (result: GenerateResult) => void;
}

export function HomePage({ onResult }: HomePageProps) {
  const [companyName, setCompanyName] = useState('');
  const [deployTarget, setDeployTarget] = useState<DeployTarget>('none');
  const [step, setStep] = useState<Step>('idle');
  const [progress, setProgress] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  // 从历史记录加载
  const loadFromHistory = (record: HistoryRecord) => {
    setCompanyName(record.companyName);
    setDeployTarget(record.deployTarget as DeployTarget);
    setResult(record);
    setStep('completed');
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

  const handleSearch = async () => {
    if (!companyName.trim()) {
      toast({
        title: '请输入企业名称',
        description: '请输入要搜索的企业名称',
        variant: 'destructive',
      });
      return;
    }

    setStep('searching');
    setProgress(10);
    setError(null);
    setSearchResults([]);

    try {
      const response = await apiClient.searchCompany(companyName);
      
      if (response.success && response.data) {
        setSearchResults(response.data.results);
        toast({
          title: '搜索成功',
          description: `找到 ${response.data.results.length} 条相关结果`,
        });
      } else {
        throw new Error(response.message || '搜索失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败');
      toast({
        title: '搜索失败',
        description: err instanceof Error ? err.message : '未知错误',
        variant: 'destructive',
      });
    }
  };

  const handleGenerate = async () => {
    if (!companyName.trim()) {
      toast({
        title: '请输入企业名称',
        description: '请输入要生成官网的企业名称',
        variant: 'destructive',
      });
      return;
    }

    setStep('generating');
    setProgress(0);
    setError(null);

    // 模拟进度
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const response = await apiClient.generateWebsite(companyName, deployTarget);
      clearInterval(progressInterval);
      setProgress(100);

      if (response.success && response.data) {
        setResult(response.data);
        toast({
          title: '生成成功',
          description: deployTarget !== 'none' ? `官网已生成并部署到${deployTarget === 'github' ? 'GitHub Pages' : '七牛云'}` : '官网已生成',
        });
        onResult?.(response.data);
      } else {
        throw new Error(response.message || '生成失败');
      }
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : '生成失败');
      toast({
        title: '生成失败',
        description: err instanceof Error ? err.message : '未知错误',
        variant: 'destructive',
      });
    } finally {
      setStep('completed');
    }
  };

  const handleReset = () => {
    setCompanyName('');
    setDeployTarget('none');
    setStep('idle');
    setProgress(0);
    setSearchResults([]);
    setResult(null);
    setError(null);
  };

  const renderContent = () => {
    if (step === 'idle' || step === 'searching') {
      return (
        <div className="space-y-6">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg animate-float">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              企业官网生成器
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              输入企业名称，AI 自动搜索信息并生成精美官网
            </p>
          </div>

          {/* Search Form */}
          <Card className="w-full max-w-lg mx-auto border-2 border-blue-100 dark:border-blue-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    开始生成
                  </CardTitle>
                  <CardDescription>
                    输入您想要生成官网的企业名称
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => { loadHistory(); setStep('history'); }}
                >
                  <History className="w-4 h-4 mr-1" />
                  历史记录
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="例如：腾讯科技、阿里巴巴..."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  disabled={step === 'searching'}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSearch} 
                  disabled={step === 'searching' || !companyName.trim()}
                >
                  {step === 'searching' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2 animate-fade-in">
                  <Label>搜索结果</Label>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {searchResults.slice(0, 3).map((item, index) => (
                      <div 
                        key={index} 
                        className="p-2 rounded-md bg-muted text-sm"
                      >
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label>部署方式</Label>
                <RadioGroup
                  value={deployTarget}
                  onValueChange={(value) => setDeployTarget(value as DeployTarget)}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="none" />
                    <Label htmlFor="none" className="cursor-pointer">
                      不部署（仅生成静态文件）
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="qiniu" id="qiniu" />
                    <Label htmlFor="qiniu" className="cursor-pointer flex items-center gap-1">
                      <Cloud className="w-4 h-4" />
                      部署到七牛云（需要配置）
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="github" id="github" />
                    <Label htmlFor="github" className="cursor-pointer flex items-center gap-1">
                      <Github className="w-4 h-4" />
                      部署到 GitHub Pages
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button 
                onClick={handleGenerate}
                disabled={step === 'searching' || !companyName.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {step === 'searching' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    搜索中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    生成官网
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-8">
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
                <Github className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold">一键部署</h3>
              <p className="text-sm text-muted-foreground">
                部署到 GitHub Pages
              </p>
            </Card>
          </div>
        </div>
      );
    }

    // History
    if (step === 'history') {
      return (
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
                  className="cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => loadFromHistory(record)}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">{record.companyName}</CardTitle>
                    <div className="flex items-center gap-2">
                      {record.previewUrl && (
                        <a 
                          href={record.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-green-600 hover:underline text-sm"
                        >
                          预览
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeleteHistory(record.id, e)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {record.companyInfo?.business?.slice(0, 80)}...
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      创建时间：{new Date(record.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (step === 'generating') {
      return (
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              正在生成官网
            </CardTitle>
            <CardDescription>
              正在处理：{companyName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="h-2" />
            <div className="space-y-2 text-sm">
              <div className={`flex items-center gap-2 ${progress >= 10 ? 'text-green-600' : 'text-muted-foreground'}`}>
                {progress >= 10 ? <CheckCircle2 className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                搜索企业信息
              </div>
              <div className={`flex items-center gap-2 ${progress >= 40 ? 'text-green-600' : 'text-muted-foreground'}`}>
                {progress >= 40 ? <CheckCircle2 className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                AI 分析提取关键信息
              </div>
              <div className={`flex items-center gap-2 ${progress >= 70 ? 'text-green-600' : 'text-muted-foreground'}`}>
                {progress >= 70 ? <CheckCircle2 className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                生成企业官网
              </div>
              {deployTarget === 'github' ? (
                <div className={`flex items-center gap-2 ${progress >= 100 ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {progress >= 100 ? <CheckCircle2 className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                  部署到 GitHub Pages
                </div>
              ) : deployTarget === 'qiniu' ? (
                <div className={`flex items-center gap-2 ${progress >= 100 ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {progress >= 100 ? <CheckCircle2 className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                  部署到七牛云
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-4 h-4" />
                  跳过部署
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    // Completed
    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="w-full max-w-lg mx-auto border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-6 h-6" />
              生成成功！
            </CardTitle>
            <CardDescription>
              企业官网已成功生成
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="font-semibold">{result.companyInfo.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {result.companyInfo.business?.slice(0, 100)}...
                  </p>
                </div>

                <div className="text-sm space-y-1">
                  <p><strong>行业：</strong>{result.companyInfo.industry || '未知'}</p>
                  <p><strong>地点：</strong>{result.companyInfo.location || '未知'}</p>
                  <p><strong>生成文件：</strong>{result.generatedFiles.length} 个文件</p>
                </div>

                {result.githubUrl && (
                  <a
                    href={result.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    GitHub Pages 在线预览
                  </a>
                )}

                {result.previewUrl && (
                  <a
                    href={result.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-green-600 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    七牛云预览地址
                  </a>
                )}
              </div>
            )}

            <Button onClick={handleReset} variant="outline" className="w-full">
              生成下一个企业
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {renderContent()}
      </div>
    </div>
  );
}

export default HomePage;
