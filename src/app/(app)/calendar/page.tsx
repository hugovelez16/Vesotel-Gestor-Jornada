
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { es } from 'date-fns/locale';

export default function CalendarPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>
                <p className="text-muted-foreground">Visualiza tus jornadas laborales por mes.</p>
            </div>
            <div className="flex justify-center">
                 <Card className="w-full max-w-2xl">
                    <CardContent className="p-2 md:p-6">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="p-0"
                            locale={es}
                            weekStartsOn={1}
                            classNames={{
                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                month: "space-y-4 w-full",
                                table: "w-full border-collapse space-y-1",
                                head_row: "flex justify-around",
                                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                                row: "flex w-full mt-2 justify-around",
                                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-full",
                                day_selected:
                                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground focus-visible:outline-none",
                                day_today: "bg-accent text-accent-foreground rounded-full",
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
