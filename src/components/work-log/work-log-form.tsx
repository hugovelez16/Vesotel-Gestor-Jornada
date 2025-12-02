"use client";

import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar-rac";
import { RangeCalendar } from "@/components/ui/calendar-rac";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "react-aria-components";
import type { WorkLog } from "@/lib/types";

interface WorkLogFormProps {
    formData: Partial<WorkLog>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<WorkLog>>>;
    logType: 'particular' | 'tutorial';
    setLogType: (type: 'particular' | 'tutorial') => void;
}

export function WorkLogForm({ formData, setFormData, logType, setLogType }: WorkLogFormProps) {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    useEffect(() => {
        if (logType === 'particular') {
            setFormData(prev => ({...prev, arrivesPrior: false, hasNight: false}));
        }
    }, [logType, setFormData]);

    useEffect(() => {
        if (!formData.hasNight) {
            setFormData(prev => ({...prev, arrivesPrior: false}));
        }
    }, [formData.hasNight, setFormData]);

    const handleDateChange = (field: 'date' | 'startDate' | 'endDate', value: DateValue) => {
        if (value) {
            setFormData(prev => ({ ...prev, [field]: value.toString() }));
        }
    };

    const handleRangeChange = (range: { start: DateValue, end: DateValue } | null) => {
        if (range) {
            setFormData(prev => ({
                ...prev,
                startDate: range.start.toString(),
                endDate: range.end.toString()
            }));
            if (range.end) {
                setIsCalendarOpen(false);
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSwitchChange = (name: keyof WorkLog, checked: boolean) => {
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    return (
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Tipo</Label>
                <RadioGroup value={logType} defaultValue="particular" className="col-span-3 flex gap-4" onValueChange={(value: 'particular' | 'tutorial') => setLogType(value)}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="particular" id="r1" />
                        <Label htmlFor="r1">Particular</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="tutorial" id="r2" />
                        <Label htmlFor="r2">Tutorial</Label>
                    </div>
                </RadioGroup>
            </div>

            {logType === 'particular' ? (
                <>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Fecha</Label>
                        <Popover modal={false} open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("col-span-3 justify-start text-left font-normal truncate", !formData.date && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                    {formData.date ? format(new Date(formData.date), "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar 
                                    value={formData.date ? parseDate(formData.date) : undefined} 
                                    onChange={(d: DateValue) => { handleDateChange('date', d); setIsCalendarOpen(false); }} 
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="startTime" className="text-right">Hora Inicio</Label>
                        <Input id="startTime" name="startTime" type="time" className="col-span-3" value={formData.startTime || ''} onChange={handleInputChange} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="endTime" className="text-right">Hora Fin</Label>
                        <Input id="endTime" name="endTime" type="time" className="col-span-3" value={formData.endTime || ''} onChange={handleInputChange} />
                    </div>
                </>
            ) : (
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">Rango de Fechas</Label>
                    <Popover modal={false} open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("col-span-3 justify-start text-left font-normal truncate", (!formData.startDate || !formData.endDate) && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                {formData.startDate && formData.endDate ? (
                                    <>
                                        {format(parseISO(formData.startDate), "PPP", { locale: es })} -{" "}
                                        {format(parseISO(formData.endDate), "PPP", { locale: es })}
                                    </>
                                ) : (
                                    <span>Selecciona un rango</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <RangeCalendar
                                value={formData.startDate && formData.endDate ? { start: parseDate(formData.startDate), end: parseDate(formData.endDate) } : null}
                                onChange={(range) => handleRangeChange(range)}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Descripción</Label>
                <Input id="description" name="description" className="col-span-3" value={formData.description || ''} onChange={handleInputChange}/>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Opciones</Label>
                <div className="col-span-3 space-y-2">
                <div className="flex items-center space-x-2">
                    <Switch id="hasCoordination" name="hasCoordination" checked={formData.hasCoordination} onCheckedChange={(c) => handleSwitchChange('hasCoordination', c)}/>
                    <Label htmlFor="hasCoordination">Coordinación</Label>
                </div>
                {logType === 'tutorial' && (
                    <div className="flex items-center space-x-2">
                        <Switch id="hasNight" name="hasNight" checked={formData.hasNight} onCheckedChange={(c) => handleSwitchChange('hasNight', c)}/>
                        <Label htmlFor="hasNight">Nocturnidad</Label>
                    </div>
                )}
                {logType === 'tutorial' && formData.hasNight && (
                    <div className="flex items-center space-x-2 pl-6">
                        <Switch id="arrivesPrior" name="arrivesPrior" checked={formData.arrivesPrior} onCheckedChange={(c) => handleSwitchChange('arrivesPrior', c)}/>
                        <Label htmlFor="arrivesPrior">Llegada Día Anterior</Label>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}
